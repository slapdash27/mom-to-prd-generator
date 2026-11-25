import { google } from "@ai-sdk/google";
import {
  APICallError,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
} from "ai";
import { buildPrdSystemPrompt } from "@/lib/prompts";
import { isTeamAccessTokenValid } from "@/lib/team-auth";
import {
  DEFAULT_GEMINI_MODEL,
  MIN_MOM_LENGTH,
  TEAM_ACCESS_TOKEN_HEADER,
  type GeneratePrdErrorResponse,
  type GeneratePrdRequest,
} from "@/types/prd";

export const maxDuration = 120;

function describeStreamError(error: unknown): string {
  if (error instanceof APICallError) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return "API key Google tidak valid atau tidak memiliki akses. Periksa GOOGLE_GENERATIVE_AI_API_KEY di .env.local.";
    }
    if (error.statusCode === 404) {
      return "Model Gemini tidak tersedia. Periksa GEMINI_MODEL di .env.local.";
    }
    if (error.statusCode === 429) {
      return "Kuota Gemini habis atau terlalu banyak permintaan. Coba lagi beberapa saat.";
    }
    if (error.statusCode === 503 || error.statusCode === 529) {
      return "Gemini sedang sibuk. Coba lagi beberapa saat.";
    }
    return `Gagal memanggil Gemini (HTTP ${error.statusCode}).`;
  }

  return error instanceof Error
    ? error.message
    : "Terjadi kesalahan saat membuat PRD.";
}

export async function POST(request: Request): Promise<Response> {
  if (!isTeamAccessTokenValid(request.headers.get(TEAM_ACCESS_TOKEN_HEADER))) {
    return Response.json(
      {
        error:
          "Akses tim belum terverifikasi. Muat ulang halaman dan masukkan password tim.",
      } satisfies GeneratePrdErrorResponse,
      { status: 401 }
    );
  }

  let body: Partial<GeneratePrdRequest>;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Payload tidak valid. Kirim data dalam format JSON." } satisfies GeneratePrdErrorResponse,
      { status: 400 }
    );
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

  if (prompt.length < MIN_MOM_LENGTH) {
    return Response.json(
      {
        error: `Catatan MoM terlalu pendek. Minimal ${MIN_MOM_LENGTH} karakter.`,
      } satisfies GeneratePrdErrorResponse,
      { status: 400 }
    );
  }

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return Response.json(
      {
        error:
          "GOOGLE_GENERATIVE_AI_API_KEY belum diatur. Tambahkan ke .env.local lalu restart server.",
      } satisfies GeneratePrdErrorResponse,
      { status: 503 }
    );
  }

  const system = await buildPrdSystemPrompt();

  const result = streamText({
    model: google(process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL),
    system,
    prompt,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: describeStreamError,
    }),
  });
}
