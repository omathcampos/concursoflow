"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Block, CycleEntry, Review, Session, Subject, Topic } from "@/lib/data/types";
import {
  buildBlocosTable,
  buildEvolucaoSemanalTable,
  buildGradeCalendario,
  buildResumoSheet,
  buildRevisoesTable,
  buildSessoesTable,
  resolveExportRange,
  type ExportCell,
  type ExportColumn,
  type ExportPeriod,
  type ExportTable,
} from "@/lib/domain/export";

interface ExportDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: Subject[];
  topics: Topic[];
  sessions: Session[];
  blocks: Block[];
  reviews: Review[];
  cycleEntries: CycleEntry[];
}

type PeriodKind = "30d" | "90d" | "all" | "custom";
type FileFormat = "xlsx" | "csv";
type SheetKey = "resumo" | "sessoes" | "blocos" | "revisoes" | "evolucao" | "grade";

const SHEET_LABELS: Record<SheetKey, string> = {
  resumo: "Resumo",
  sessoes: "Sessões",
  blocos: "Blocos",
  revisoes: "Revisões",
  evolucao: "Evolução semanal",
  grade: "Grade do calendário",
};

const SHEET_ORDER: SheetKey[] = ["resumo", "sessoes", "blocos", "revisoes", "evolucao", "grade"];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDateStamp(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatCellForCsv(value: ExportCell, type: ExportColumn["type"]): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return `${pad2(value.getDate())}/${pad2(value.getMonth() + 1)}/${value.getFullYear()}`;
  if (type === "percent" && typeof value === "number") return `${Math.round(value * 1000) / 10}%`;
  return String(value);
}

function tableToCsv(table: ExportTable): string {
  const escape = (cell: string) => (cell.includes(",") || cell.includes('"') || cell.includes("\n") ? `"${cell.replace(/"/g, '""')}"` : cell);
  const headerLine = table.columns.map((c) => escape(c.header)).join(",");
  const lines = table.rows.map((row) => row.map((cell, i) => escape(formatCellForCsv(cell, table.columns[i].type))).join(","));
  return [headerLine, ...lines].join("\r\n") + "\r\n";
}

function downloadBlob(content: string | ArrayBuffer, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const NUMBER_FORMAT_BY_TYPE: Record<ExportColumn["type"], string | undefined> = {
  text: undefined,
  date: "dd/mm/yyyy",
  datetime: "dd/mm/yyyy hh:mm",
  number: "0.0",
  integer: "0",
  percent: "0.0%",
};

export function ExportDataDialog({ open, onOpenChange, subjects, topics, sessions, blocks, reviews, cycleEntries }: ExportDataDialogProps) {
  const [periodKind, setPeriodKind] = useState<PeriodKind>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [fileFormat, setFileFormat] = useState<FileFormat>("xlsx");
  const [selectedSheets, setSelectedSheets] = useState<Record<SheetKey, boolean>>({
    resumo: true,
    sessoes: true,
    blocos: true,
    revisoes: true,
    evolucao: true,
    grade: true,
  });
  const [generating, setGenerating] = useState(false);

  function toggleSheet(key: SheetKey, checked: boolean) {
    setSelectedSheets((s) => ({ ...s, [key]: checked }));
  }

  async function addTableSheet(workbook: import("exceljs").Workbook, name: string, table: ExportTable, headerRowOffset = 0) {
    const worksheet = workbook.getWorksheet(name) ?? workbook.addWorksheet(name);
    const startRow = headerRowOffset + 1;

    const headerRow = worksheet.getRow(startRow);
    table.columns.forEach((col, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = col.header;
      cell.font = { bold: true };
      worksheet.getColumn(i + 1).width = col.width ?? 16;
      const numFmt = NUMBER_FORMAT_BY_TYPE[col.type];
      if (numFmt) worksheet.getColumn(i + 1).numFmt = numFmt;
    });
    headerRow.commit();

    table.rows.forEach((row, rowIndex) => {
      const excelRow = worksheet.getRow(startRow + 1 + rowIndex);
      row.forEach((cell, colIndex) => {
        excelRow.getCell(colIndex + 1).value = cell instanceof Date ? cell : (cell ?? undefined);
      });
      excelRow.commit();
    });

    if (table.columns.length > 0) {
      worksheet.autoFilter = {
        from: { row: startRow, column: 1 },
        to: { row: startRow, column: table.columns.length },
      };
    }

    return worksheet;
  }

  async function buildGradeSheet(workbook: import("exceljs").Workbook) {
    const range = resolveExportRange(currentPeriod());
    const sections = buildGradeCalendario(blocks, subjects, reviews, range);
    const worksheet = workbook.addWorksheet(SHEET_LABELS.grade);
    worksheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
    worksheet.getColumn(1).width = 12;
    for (let i = 2; i <= 8; i++) worksheet.getColumn(i).width = 20;

    const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    let currentRow = 1;

    if (sections.length === 0) {
      worksheet.getCell(1, 1).value = "Nenhum bloco no período selecionado.";
      return;
    }

    for (const section of sections) {
      const titleCell = worksheet.getCell(currentRow, 1);
      titleCell.value = section.weekLabel;
      titleCell.font = { bold: true, size: 13 };
      currentRow += 1;

      const headerRow = worksheet.getRow(currentRow);
      headerRow.getCell(1).value = "";
      WEEKDAY_LABELS.forEach((label, i) => {
        const cell = headerRow.getCell(i + 2);
        cell.value = label;
        cell.font = { bold: true };
      });
      currentRow += 1;

      const reviewsRow = worksheet.getRow(currentRow);
      reviewsRow.getCell(1).value = "Revisões";
      reviewsRow.getCell(1).font = { italic: true };
      section.reviewsByDay.forEach((names, i) => {
        const cell = reviewsRow.getCell(i + 2);
        cell.value = names || "";
        cell.font = { italic: true, size: 9 };
      });
      currentRow += 1;

      for (let slotIndex = 0; slotIndex < section.timeSlots.length; slotIndex++) {
        const row = worksheet.getRow(currentRow);
        row.getCell(1).value = section.timeSlots[slotIndex];
        for (let weekday = 0; weekday < 7; weekday++) {
          const gradeCell = section.grid[slotIndex][weekday];
          const cell = row.getCell(weekday + 2);
          if (!gradeCell) continue;
          const statusMark = gradeCell.status === "done" ? " ✓" : "";
          cell.value = `${gradeCell.subjectName} — ${gradeCell.typeLabel}${statusMark}`;
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${gradeCell.color.replace("#", "").toUpperCase()}` } };
          cell.font = { color: { argb: "FFFFFFFF" }, strike: gradeCell.status === "skipped" };
          cell.alignment = { wrapText: true, vertical: "middle" };
        }
        currentRow += 1;
      }

      currentRow += 1; // linha em branco entre semanas
    }
  }

  function currentPeriod(): ExportPeriod {
    if (periodKind === "custom") return { kind: "custom", from: customFrom, to: customTo };
    return { kind: periodKind };
  }

  async function handleExport() {
    if (periodKind === "custom" && (!customFrom || !customTo)) {
      toast.error("Preencha as duas datas do intervalo customizado.");
      return;
    }

    setGenerating(true);
    try {
      const period = currentPeriod();
      const range = resolveExportRange(period);
      const now = new Date();
      const dateStamp = formatDateStamp(now);

      const tables: Partial<Record<SheetKey, ExportTable>> = {};
      let resumo: ReturnType<typeof buildResumoSheet> | null = null;

      if (selectedSheets.resumo) resumo = buildResumoSheet({ sessions, subjects, cycleEntries, range, now });
      if (selectedSheets.sessoes) tables.sessoes = buildSessoesTable(sessions, subjects, topics, range);
      if (selectedSheets.blocos) tables.blocos = buildBlocosTable(blocks, subjects, topics, range);
      if (selectedSheets.revisoes) tables.revisoes = buildRevisoesTable(reviews, subjects, topics, range, now);
      if (selectedSheets.evolucao) tables.evolucao = buildEvolucaoSemanalTable(sessions, subjects, range, now);

      if (fileFormat === "xlsx") {
        const ExcelJS = (await import("exceljs")).default;
        const workbook = new ExcelJS.Workbook();

        if (resumo) {
          const worksheet = workbook.addWorksheet(SHEET_LABELS.resumo);
          resumo.overview.forEach((entry, i) => {
            const row = worksheet.getRow(i + 1);
            row.getCell(1).value = entry.label;
            row.getCell(1).font = { bold: true };
            row.getCell(2).value = entry.value;
          });
          worksheet.getColumn(1).width = 22;
          worksheet.getColumn(2).width = 20;
          await addTableSheet(workbook, SHEET_LABELS.resumo, resumo.table, resumo.overview.length + 1);
        }
        for (const key of SHEET_ORDER) {
          if (key === "resumo" || key === "grade") continue;
          const table = tables[key];
          if (table) await addTableSheet(workbook, SHEET_LABELS[key], table);
        }
        if (selectedSheets.grade) await buildGradeSheet(workbook);

        const buffer = await workbook.xlsx.writeBuffer();
        downloadBlob(buffer, `concursoflow-export-${dateStamp}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      } else {
        if (resumo) downloadBlob(tableToCsv(resumo.table), `concursoflow-export-resumo-${dateStamp}.csv`, "text/csv;charset=utf-8");
        for (const key of SHEET_ORDER) {
          if (key === "resumo" || key === "grade") continue;
          const table = tables[key];
          if (table) downloadBlob(tableToCsv(table), `concursoflow-export-${key}-${dateStamp}.csv`, "text/csv;charset=utf-8");
        }
      }

      toast.success("Exportação concluída.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar a exportação.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Exportar dados</DialogTitle>
          <DialogDescription>Baixe seus dados de estudo em .xlsx ou .csv.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Período</Label>
            <Select value={periodKind} onValueChange={(value) => setPeriodKind(value as PeriodKind)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
                <SelectItem value="all">Tudo</SelectItem>
                <SelectItem value="custom">Intervalo customizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {periodKind === "custom" ? (
            <div className="flex items-center gap-2">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="export-from">De</Label>
                <input
                  id="export-from"
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="export-to">Até</Label>
                <input
                  id="export-to"
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label>Formato</Label>
            <Select value={fileFormat} onValueChange={(value) => setFileFormat(value as FileFormat)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="xlsx">.xlsx (Excel, multi-abas)</SelectItem>
                <SelectItem value="csv">.csv (um arquivo por aba)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Abas a incluir</Label>
            {SHEET_ORDER.map((key) => (
              <div key={key} className="group flex items-center gap-2">
                <Checkbox
                  id={`export-sheet-${key}`}
                  checked={selectedSheets[key]}
                  disabled={fileFormat === "csv" && key === "grade"}
                  onCheckedChange={(value) => toggleSheet(key, value === true)}
                />
                <Label htmlFor={`export-sheet-${key}`} className="font-normal">
                  {SHEET_LABELS[key]}
                  {fileFormat === "csv" && key === "grade" ? " (só disponível em .xlsx)" : ""}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={generating || !Object.values(selectedSheets).some(Boolean)}>
            <Download className="h-4 w-4" />
            {generating ? "Gerando…" : "Exportar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
