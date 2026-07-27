import { BookOpen, Code } from "lucide-react";
import { docs } from "collections/server";
import { loader } from "fumadocs-core/source";

const ICONS: Record<string, React.ReactNode> = {
  BookOpen: <BookOpen className="h-4 w-4" />,
  Code: <Code className="h-4 w-4" />,
};

export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
  icon: (icon) => (icon ? ICONS[icon] : undefined),
});
