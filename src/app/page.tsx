"use client";

import { useCompletion } from "@ai-sdk/react";
import { useState } from "react";

import { Header } from "@/components/header";
import { MomInputPanel } from "@/components/mom-input-panel";
import { PrdPreviewPanel } from "@/components/prd-preview-panel";
import type { PrdViewMode } from "@/types/prd";

export default function Home() {
  const [mom, setMom] = useState("");
  const [prdViewMode, setPrdViewMode] = useState<PrdViewMode>("preview");
  const { completion, complete, setCompletion, isLoading, error, stop } =
    useCompletion({ api: "/api/generate-prd" });

  function handleGenerate() {
    setPrdViewMode("preview");
    void complete(mom);
  }

  function handleClear() {
    setMom("");
    setCompletion("");
    setPrdViewMode("preview");
  }

  return (
    <div className="app-shell flex min-h-dvh flex-col bg-muted/30 lg:h-dvh lg:overflow-hidden">
      <Header />
      <main className="app-main grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-2 lg:overflow-hidden">
        <MomInputPanel
          value={mom}
          onValueChange={setMom}
          onGenerate={handleGenerate}
          onStop={stop}
          onClear={handleClear}
          isLoading={isLoading}
          error={error?.message}
        />
        <PrdPreviewPanel
          markdown={completion}
          onMarkdownChange={setCompletion}
          mode={prdViewMode}
          onModeChange={setPrdViewMode}
          isLoading={isLoading}
        />
      </main>
    </div>
  );
}
