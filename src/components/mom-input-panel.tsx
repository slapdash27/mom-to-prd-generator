"use client";

import {
  AudioLines,
  CircleAlert,
  CircleCheck,
  Eraser,
  FilePenLine,
  LoaderCircle,
  Sparkles,
  Square,
} from "lucide-react";
import { Suspense, useRef, useState } from "react";

import { MomVisualEditor } from "@/components/mom-visual-editor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { validateAudioUpload } from "@/lib/audio";
import {
  compressAudioFile,
  MAX_COMPRESSED_FILE_SIZE,
  type AudioCompressionProgress,
  type AudioCompressionStage,
} from "@/lib/audio-compressor";
import { cn } from "@/lib/utils";
import {
  AUDIO_FILE_ACCEPT,
  MAX_AUDIO_UPLOAD_SIZE,
  MIN_MOM_LENGTH,
  type AudioChunk,
  type TranscribeProgress,
} from "@/types/prd";

interface MomInputPanelProps {
  value: string;
  onValueChange: (value: string) => void;
  onGenerate: () => void;
  onStop: () => void;
  onClear: () => void;
  onTranscribe: (
    chunks: AudioChunk[],
    onProgress: (progress: TranscribeProgress) => void
  ) => Promise<string>;
  isLoading: boolean;
  error?: string;
}

type TranscriptionStage = "idle" | "optimizing" | "uploading" | "transcribing";

export function MomInputPanel({
  value,
  onValueChange,
  onGenerate,
  onStop,
  onClear,
  onTranscribe,
  isLoading,
  error,
}: MomInputPanelProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [stage, setStage] = useState<TranscriptionStage>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(
    null
  );
  const [transcriptionNotice, setTranscriptionNotice] = useState<string | null>(
    null
  );
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isTranscribing = stage !== "idle";
  const showProgress = isTranscribing || progress === 100;
  const isValid = value.trim().length >= MIN_MOM_LENGTH;
  const busy = isLoading || isTranscribing;
  const displayedError = transcriptionError ?? error;

  function updateProgress(next: number, label: string) {
    setProgress((current) =>
      Math.max(current, Math.max(0, Math.min(100, Math.round(next))))
    );
    setProgressLabel(label);
  }

  function compressionRange(stageName: AudioCompressionStage): [number, number] {
    switch (stageName) {
      case "decoding":
        return [0, 10];
      case "resampling":
        return [10, 20];
      case "validating":
        return [20, 25];
      case "encoding":
        return [25, 45];
    }
  }

  function handleCompressionProgress(progressUpdate: AudioCompressionProgress) {
    const [from, to] = compressionRange(progressUpdate.stage);
    const ratio = Math.max(0, Math.min(1, progressUpdate.progress));
    setStage("optimizing");
    updateProgress(
      from + (to - from) * ratio,
      "Mengoptimalkan & mengompresi audio di browser"
    );
  }

  function handleUploadProgress(progressUpdate: TranscribeProgress) {
    const uploadRatio =
      progressUpdate.totalBytes > 0
        ? Math.min(1, progressUpdate.uploadedBytes / progressUpdate.totalBytes)
        : 1;

    if (uploadRatio < 1) {
      setStage("uploading");
      updateProgress(
        45 + 15 * uploadRatio,
        "Mengunggah rekaman ke server"
      );
      return;
    }

    const chunkRatio =
      progressUpdate.totalChunks > 0
        ? progressUpdate.completedChunks / progressUpdate.totalChunks
        : 1;
    setStage("transcribing");
    updateProgress(
      60 + 39 * chunkRatio,
      "AI sedang menyusun MoM dari rekaman"
    );
  }

  async function handleFile(file: File) {
    setTranscriptionError(null);
    setTranscriptionNotice(null);
    setProgress(0);
    setProgressLabel("");

    const validationError = validateAudioUpload(file);
    if (validationError) {
      setTranscriptionError(validationError);
      return;
    }

    setSelectedFile(file);
    setStage("optimizing");

    try {
      const compressed = await compressAudioFile(file, handleCompressionProgress);
      if (compressed.compressedSize > MAX_COMPRESSED_FILE_SIZE) {
        throw new Error(
          `Hasil kompresi masih terlalu besar (${(compressed.compressedSize / (1024 * 1024)).toFixed(1)} MB). Potong rekaman menjadi bagian lebih pendek lalu coba lagi.`
        );
      }

      const mom = await onTranscribe(compressed.chunks, handleUploadProgress);
      const hasExistingNote = value.trim().length > 0;

      onValueChange(hasExistingNote ? `${value.trimEnd()}\n\n${mom}` : mom);
      setTranscriptionNotice(
        hasExistingNote
          ? "MoM dari rekaman ditambahkan di bawah catatan yang sudah ada. Periksa sebelum membuat PRD."
          : "MoM dari rekaman siap ditinjau di kolom catatan."
      );
      updateProgress(100, "MoM dari rekaman selesai disusun");
      setSelectedFile(null);
    } catch (caughtError) {
      setProgress(0);
      setProgressLabel("");
      setTranscriptionError(
        caughtError instanceof Error
          ? caughtError.message
          : "Gagal menyusun MoM dari rekaman."
      );
    } finally {
      setStage("idle");
    }
  }

  return (
    <Card className="min-h-[32rem] min-w-0 lg:min-h-0">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <FilePenLine className="size-4 text-muted-foreground" />
          Catatan Rapat (MoM)
        </CardTitle>
        <CardDescription>
          Tempel catatan rapat mentah atau unggah rekaman rapat untuk dibuatkan
          MoM terstruktur.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 pt-4">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            if (!busy) {
              setIsDragging(true);
            }
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            if (busy) {
              return;
            }
            const droppedFile = event.dataTransfer.files[0];
            if (droppedFile) {
              void handleFile(droppedFile);
            }
          }}
          className={cn(
            "flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-3 transition-colors",
            isDragging ? "border-primary bg-primary/5" : "bg-muted/20"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={AUDIO_FILE_ACCEPT}
            className="hidden"
            aria-label="Pilih file rekaman rapat"
            onChange={(event) => {
              const input = event.currentTarget;
              const file = input.files?.[0];
              input.value = "";
              if (file) {
                void handleFile(file);
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            {isTranscribing ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <AudioLines />
            )}
            Upload Rekaman Rapat
          </Button>
          <span className="text-xs text-muted-foreground">
            .mp3, .m4a, .wav, .ogg, .webm · maks. {MAX_AUDIO_UPLOAD_SIZE / (1024 * 1024)} MB · drag-and-drop didukung
          </span>
          {showProgress ? (
            <div className="w-full space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                  {isTranscribing ? (
                    <LoaderCircle className="size-3.5 shrink-0 animate-spin" />
                  ) : (
                    <CircleCheck className="size-3.5 shrink-0" />
                  )}
                  <span className="truncate">{progressLabel}</span>
                </span>
                <span className="shrink-0 font-medium tabular-nums">
                  {progress}%
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="Progres pemrosesan rekaman"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                className="h-2 w-full overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {selectedFile ? (
                <span className="block truncate text-xs text-muted-foreground">
                  {selectedFile.name}
                </span>
              ) : null}
            </div>
          ) : null}
          {transcriptionNotice ? (
            <span className="flex w-full items-start gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
              <CircleCheck className="mt-0.5 size-3.5 shrink-0" />
              <span>{transcriptionNotice}</span>
            </span>
          ) : null}
        </div>

        <Suspense
          fallback={
            <div className="flex min-h-64 flex-1 flex-col gap-2 rounded-md border bg-background p-3 lg:min-h-0">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
            </div>
          }
        >
          <MomVisualEditor
            value={value}
            onChange={onValueChange}
            disabled={busy}
          />
        </Suspense>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {value.trim().length} karakter
            {!isValid ? ` · minimal ${MIN_MOM_LENGTH}` : ""}
          </span>
          <span>Bahasa Indonesia</span>
        </div>

        {displayedError ? (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertDescription>{displayedError}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>

      <CardFooter className="flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClear}
          disabled={isLoading || value.length === 0}
        >
          <Eraser />
          Kosongkan
        </Button>
        <div className="ml-auto flex gap-2">
          {isLoading ? (
            <Button type="button" variant="destructive" onClick={onStop}>
              <Square />
              Hentikan
            </Button>
          ) : null}
          <Button
            type="button"
            onClick={onGenerate}
            disabled={!isValid || busy}
          >
            <Sparkles />
            Buat PRD
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
