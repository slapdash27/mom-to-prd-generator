"use client";

import { useCompletion } from "@ai-sdk/react";
import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { Header } from "@/components/header";
import { MomInputPanel } from "@/components/mom-input-panel";
import { PrdPreviewPanel } from "@/components/prd-preview-panel";
import { TeamAccessGate } from "@/components/team-access-gate";
import { mergeMomChunks } from "@/lib/mom-merge";
import {
  TEAM_ACCESS_STORAGE_KEY,
  TEAM_ACCESS_TOKEN_HEADER,
  type AudioChunk,
  type PrdViewMode,
  type TeamAuthStatusResponse,
  type TranscribeMomErrorResponse,
  type TranscribeMomResponse,
  type TranscribeProgress,
} from "@/types/prd";

type AccessState = "checking" | "locked" | "unlocked";

export default function Home() {
  const [mom, setMom] = useState("");
  const [prdViewMode, setPrdViewMode] = useState<PrdViewMode>("preview");
  const [accessState, setAccessState] = useState<AccessState>("checking");
  const [teamToken, setTeamToken] = useState("");
  const { completion, complete, setCompletion, isLoading, error, stop } =
    useCompletion({ api: "/api/generate-prd" });

  useEffect(() => {
    let active = true;

    async function checkTeamAccess() {
      try {
        const response = await fetch("/api/auth", { cache: "no-store" });
        const status = (await response.json()) as TeamAuthStatusResponse;

        if (!active) {
          return;
        }

        if (!status.protected) {
          setAccessState("unlocked");
          return;
        }

        const storedToken = sessionStorage.getItem(TEAM_ACCESS_STORAGE_KEY);

        if (storedToken) {
          setTeamToken(storedToken);
        }

        setAccessState(storedToken ? "unlocked" : "locked");
      } catch {
        if (active) {
          setAccessState("locked");
        }
      }
    }

    void checkTeamAccess();

    return () => {
      active = false;
    };
  }, []);

  function handleVerified(token: string) {
    sessionStorage.setItem(TEAM_ACCESS_STORAGE_KEY, token);
    setTeamToken(token);
    setAccessState("unlocked");
  }

  function handleGenerate() {
    setPrdViewMode("preview");
    void complete(
      mom,
      teamToken
        ? { headers: { [TEAM_ACCESS_TOKEN_HEADER]: teamToken } }
        : undefined
    );
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

        if (teamToken) {
          xhr.setRequestHeader(TEAM_ACCESS_TOKEN_HEADER, teamToken);
        }

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

  if (accessState === "checking") {
    return (
      <div className="app-shell flex min-h-dvh flex-col bg-muted/30">
        <Header />
        <main className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Memeriksa akses tim...
        </main>
      </div>
    );
  }

  if (accessState === "locked") {
    return <TeamAccessGate onVerified={handleVerified} />;
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
