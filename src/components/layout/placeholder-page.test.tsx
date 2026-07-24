import { render, screen } from "@testing-library/react";
import { LayoutDashboard } from "lucide-react";
import { describe, expect, it } from "vitest";

import { PlaceholderPage } from "@/components/layout/placeholder-page";

describe("PlaceholderPage", () => {
  it("renderiza título, descrição e texto de em breve", () => {
    render(
      <PlaceholderPage
        title="Dashboard"
        description="Visão geral do seu progresso."
        icon={LayoutDashboard}
        comingSoon="Em breve: estatísticas completas."
      />,
    );

    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Visão geral do seu progresso.")).toBeInTheDocument();
    expect(screen.getByText("Em breve: estatísticas completas.")).toBeInTheDocument();
  });
});
