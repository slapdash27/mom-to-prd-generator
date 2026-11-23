import { FileText, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function Header() {
  return (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b bg-background px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <FileText className="size-5" />
        </div>
        <div>
          <h1 className="text-base font-semibold tracking-tight">
            MoM <span className="text-muted-foreground">→</span> PRD Generator
          </h1>
          <p className="text-xs text-muted-foreground">
            Ubah catatan rapat menjadi Product Requirements Document.
          </p>
        </div>
      </div>
      <Badge variant="secondary" className="gap-1.5">
        <Sparkles className="size-3.5" />
        Gemini
      </Badge>
    </header>
  );
}
