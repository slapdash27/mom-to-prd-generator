"use client";

import {
  Check,
  ClipboardCopy,
  Download,
  Eye,
  FileOutput,
  FileText,
  LoaderCircle,
  Pencil,
  Printer,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PrdVisualEditor } from "@/components/prd-visual-editor";
import {
  copyText,
  downloadDocx,
  downloadMarkdown,
  exportToPdf,
} from "@/lib/utils";
import type { PrdViewMode } from "@/types/prd";

interface PrdPreviewPanelProps {
  markdown: string;
  onMarkdownChange: (value: string) => void;
  mode: PrdViewMode;
  onModeChange: (mode: PrdViewMode) => void;
  isLoading: boolean;
}

type CopyStatus = "idle" | "copied" | "error";
type DocxStatus = "idle" | "loading" | "error";

export function PrdPreviewPanel({
  markdown,
  onMarkdownChange,
  mode,
  onModeChange,
  isLoading,
}: PrdPreviewPanelProps) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [docxStatus, setDocxStatus] = useState<DocxStatus>("idle");
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const docxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLoading && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [markdown, isLoading]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (docxTimerRef.current) clearTimeout(docxTimerRef.current);
    };
  }, []);

  async function handleDownloadDocx() {
    setDocxStatus("loading");

    try {
      await downloadDocx(markdown);
      setDocxStatus("idle");
    } catch {
      setDocxStatus("error");
      if (docxTimerRef.current) clearTimeout(docxTimerRef.current);
      docxTimerRef.current = setTimeout(() => setDocxStatus("idle"), 2500);
    }
  }

  async function handleCopy() {
    try {
      await copyText(markdown);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopyStatus("idle"), 2000);
  }

  const hasContent = markdown.trim().length > 0;
  const activeMode: PrdViewMode =
    !hasContent || isLoading ? "preview" : mode;

  return (
    <Card className="prd-preview-card min-h-[28rem] min-w-0 lg:min-h-0">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <FileOutput className="size-4 text-muted-foreground" />
          Preview PRD
        </CardTitle>
        <CardDescription>
          Dokumen terbentuk langsung saat proses berjalan.
        </CardDescription>
        <CardAction>
          {isLoading ? (
            <Badge variant="secondary" className="gap-1.5">
              <LoaderCircle className="size-3.5 animate-spin" />
              Menyusun
            </Badge>
          ) : hasContent ? (
            <Badge variant="outline">
              {activeMode === "edit" ? "Edit" : "Markdown"}
            </Badge>
          ) : null}
        </CardAction>
      </CardHeader>

      <CardContent className="prd-preview-content flex min-h-0 flex-1 flex-col gap-3 pt-4">
        <div className="prd-toolbar flex flex-wrap gap-2">
          <div className="flex gap-1 rounded-lg border bg-muted/40 p-0.5">
            <Button
              type="button"
              size="sm"
              variant={activeMode === "preview" ? "secondary" : "ghost"}
              onClick={() => onModeChange("preview")}
              disabled={!hasContent || isLoading}
              aria-pressed={activeMode === "preview"}
            >
              <Eye />
              Preview
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeMode === "edit" ? "secondary" : "ghost"}
              onClick={() => onModeChange("edit")}
              disabled={!hasContent || isLoading}
              aria-pressed={activeMode === "edit"}
            >
              <Pencil />
              Edit
            </Button>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void handleCopy()}
            disabled={!hasContent}
          >
            {copyStatus === "copied" ? <Check /> : <ClipboardCopy />}
            {copyStatus === "copied"
              ? "Tersalin"
              : copyStatus === "error"
                ? "Gagal menyalin"
                : "Salin"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => downloadMarkdown(markdown)}
            disabled={!hasContent || isLoading}
            title={isLoading ? "Tunggu proses selesai" : undefined}
          >
            <Download />
            Unduh .md
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void handleDownloadDocx()}
            disabled={!hasContent || isLoading || docxStatus === "loading"}
            title={isLoading ? "Tunggu proses selesai" : undefined}
          >
            {docxStatus === "loading" ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <FileText />
            )}
            {docxStatus === "loading"
              ? "Menyiapkan..."
              : docxStatus === "error"
                ? "Gagal .docx"
                : "Unduh .docx"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => exportToPdf(markdown)}
            disabled={!hasContent || isLoading}
            title={isLoading ? "Tunggu proses selesai" : undefined}
          >
            <Printer />
            Unduh .pdf
          </Button>
        </div>

        {activeMode === "edit" ? (
          <div className="min-h-64 flex-1 overflow-hidden rounded-lg border bg-background print:hidden lg:min-h-0">
            <PrdVisualEditor
              markdown={markdown}
              onMarkdownChange={onMarkdownChange}
            />
          </div>
        ) : null}
        <div
          ref={scrollRef}
          className={`prd-scroll min-h-64 flex-1 overflow-y-auto rounded-lg border bg-muted/20 p-4 lg:min-h-0 ${
            activeMode === "edit" ? "hidden print:block" : ""
          }`}
        >
          {hasContent ? (
            <div className="prd-print-area prose prose-sm max-w-none">
              <div className="prd-markdown [&_table]:block [&_table]:overflow-x-auto">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {markdown}
                </ReactMarkdown>
                {isLoading ? (
                  <span className="prd-cursor ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-foreground align-middle" />
                ) : null}
              </div>
            </div>
          ) : isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ) : activeMode === "edit" ? null : (
            <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <FileOutput className="size-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Belum ada PRD</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Masukkan catatan rapat, lalu klik &ldquo;Buat PRD&rdquo;.
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
