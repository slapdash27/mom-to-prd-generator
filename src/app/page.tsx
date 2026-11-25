"use client";

import { useCompletion } from "@ai-sdk/react";
import { useState } from "react";

import { Header } from "@/components/header";
import { MomInputPanel } from "@/components/mom-input-panel";
import { PrdPreviewPanel } from "@/components/prd-preview-panel";
import { mergeMomChunks } from "@/lib/mom-merge";
import {
  type AudioChunk,
  type PrdViewMode,
  type TranscribeMomErrorResponse,
  type TranscribeMomResponse,
  type TranscribeProgress,
} from "@/types/prd";

export default function Home() {
  const [mom, setMom] = useState("");
  const [prdViewMode, setPrdViewMode] = useState<PrdViewMode>("preview");
  const { completion, complete, setCompletion, isLoading, error, stop } =
    useCompletion({ api: "/api/generate-prd" });

  function handleGenerate() {
    setPrdViewMode("preview");
    void complete(mom);
  }

  async function handleTranscribe(
    chunks: AudioChunk[],
    onProgress: (progress: TranscribeProgress) => void
  ): Promise<string> {
    const totalBytes = chunks.reduce((sum, chunk) => sum + chunk.file.size, 0);
    let uploadedBytes = 0;
    let completedChunks = 0;
    let noSpeechChunks = 0;
    const results: string[] = [];

    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index];

      const data = await new Promise<
        TranscribeMomResponse | TranscribeMomErrorResponse
      >((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/transcribe-mom");

        const formData = new FormData();
        formData.append("audio", chunk.file);
        formData.append("durationSeconds", String(chunk.durationSeconds));
        formData.append("startTime", String(chunk.startTime));
        formData.append("chunkIndex", String(index + 1));
        formData.append("chunkCount", String(chunks.length));

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          onProgress({
            uploadedBytes: uploadedBytes + event.loaded,
            totalBytes,
            completedChunks,
            totalChunks: chunks.length,
          });
        };

        xhr.onload = () => {
          let parsed: TranscribeMomResponse | TranscribeMomErrorResponse;

          try {
            parsed = JSON.parse(xhr.responseText) as
              | TranscribeMomResponse
              | TranscribeMomErrorResponse;
          } catch {
            reject(new Error("Respons server tidak dapat dibaca. Coba lagi."));
            return;
          }

          if (xhr.status < 200 || xhr.status >= 300) {
            reject(
              new Error(
                "error" in parsed
                  ? parsed.error
                  : `Gagal menyusun MoM dari rekaman (HTTP ${xhr.status}).`
              )
            );
            return;
          }

          resolve(parsed);
        };

        xhr.onerror = () => {
          reject(
            new Error(
              "Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi."
            )
          );
        };

        xhr.send(formData);
      });

      if ("error" in data) {
        if (data.code === "NO_SPEECH") {
          noSpeechChunks += 1;
        } else {
          throw new Error(data.error);
        }
      } else {
        results.push(data.mom);
      }

      uploadedBytes += chunk.file.size;
      completedChunks += 1;
      onProgress({
        uploadedBytes,
        totalBytes,
        completedChunks,
        totalChunks: chunks.length,
      });
    }

    if (results.length === 0) {
      throw new Error(
        noSpeechChunks > 0
          ? "Tidak terdeteksi percakapan yang jelas di seluruh rekaman. Periksa kualitas audio lalu coba lagi."
          : "Gemini tidak menghasilkan MoM dari rekaman ini. Coba gunakan file lain."
      );
    }

    return mergeMomChunks(results);
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
          onTranscribe={handleTranscribe}
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
