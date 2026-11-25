import { google } from "@ai-sdk/google";
import { APICallError, generateText } from "ai";

import { getAudioMimeType, validateCompressedAudioFile } from "@/lib/audio";
import { buildMomTranscriptionSystemPrompt } from "@/lib/prompts";
import {
  DEFAULT_GEMINI_MODEL,
  FALLBACK_TRANSCRIBE_MODELS,
  MAX_TRANSCRIBE_CHUNK_SIZE,
  NO_SPEECH_SENTINEL,
  type TranscribeMomErrorResponse,
  type TranscribeMomErrorCode,
  type TranscribeMomResponse,
} from "@/types/prd";

export const maxDuration = 60;

function describeGeminiError(error: unknown): string {
  if (error instanceof APICallError) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return "API key Google tidak valid atau tidak memiliki akses. Periksa GOOGLE_GENERATIVE_AI_API_KEY di .env.local.";
    }
    if (error.statusCode === 404) {
      return "Model Gemini tidak tersedia. Periksa TRANSCRIBE_GEMINI_MODEL dan GEMINI_MODEL di .env.local.";
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
    : "Terjadi kesalahan saat menyusun MoM dari rekaman.";
}

function isModelNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error instanceof APICallError && error.statusCode === 404) return true;

  return /model .*(not found|not available|does not exist|not supported)|not found: models\//i.test(
    error.message
  );
}

function getTranscribeModelCandidates(): string[] {
  const sharedModel = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const primaryModel = process.env.TRANSCRIBE_GEMINI_MODEL || sharedModel;

  return [
    ...new Set([primaryModel, sharedModel, ...FALLBACK_TRANSCRIBE_MODELS]),
  ];
}

async function generateMomFromAudio(
  bytes: Uint8Array<ArrayBuffer>,
  mediaType: string,
  fileName: string
): Promise<string> {
  const system = buildMomTranscriptionSystemPrompt();
  let lastError: unknown;

  for (const modelName of getTranscribeModelCandidates()) {
    try {
      const result = await generateText({
        model: google(modelName),
        system,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Susun Minutes of Meeting (MoM) dari rekaman rapat berikut sesuai format yang diminta.",
              },
              {
                type: "file",
                mediaType,
                filename: fileName,
                data: { type: "data", data: bytes },
              },
            ],
          },
        ],
      });

      return result.text.trim();
    } catch (error) {
      if (!isModelNotFoundError(error)) throw error;
      lastError = error;
      console.warn(
        `[transcribe-mom] model ${modelName} tidak tersedia, mencoba model fallback.`
      );
    }
  }

  throw lastError ?? new Error("Semua model Gemini tidak tersedia.");
}

function errorResponse(
  error: string,
  status: number,
  code?: TranscribeMomErrorCode
): Response {
  return Response.json(
    { error, code } satisfies TranscribeMomErrorResponse,
    { status }
  );
}

function readFiniteNumber(formData: FormData, key: string): number | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export async function POST(request: Request): Promise<Response> {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return errorResponse(
      "Payload tidak valid. Kirim file rekaman dalam format FormData.",
      400
    );
  }

  const audio = formData.get("audio");

  if (!(audio instanceof File)) {
    return errorResponse("File rekaman tidak ditemukan.", 400);
  }

  const validationError = validateCompressedAudioFile(audio);

  if (validationError) {
    return errorResponse(validationError, 400);
  }

  if (audio.size > MAX_TRANSCRIBE_CHUNK_SIZE) {
    return errorResponse(
      `Bagian rekaman melebihi batas ${(MAX_TRANSCRIBE_CHUNK_SIZE / (1024 * 1024)).toFixed(1)} MB. Potong rekaman lalu coba lagi.`,
      400
    );
  }

  const extensionMediaType = getAudioMimeType(audio.name);

  if (!extensionMediaType) {
    return errorResponse("Format rekaman tidak didukung.", 400);
  }

  const durationSeconds = readFiniteNumber(formData, "durationSeconds");
  const startTime = readFiniteNumber(formData, "startTime") ?? 0;
  const chunkIndex = readFiniteNumber(formData, "chunkIndex") ?? 1;
  const chunkCount = readFiniteNumber(formData, "chunkCount") ?? 1;

  if (durationSeconds === null || durationSeconds <= 0) {
    return errorResponse("Durasi rekaman tidak valid.", 400);
  }

  const mediaType =
    audio.type && audio.type.startsWith("audio/")
      ? audio.type
      : extensionMediaType;

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return errorResponse(
      "GOOGLE_GENERATIVE_AI_API_KEY belum diatur. Tambahkan ke .env.local lalu restart server.",
      503
    );
  }

  console.log(
    `[transcribe-mom] chunk=${chunkIndex}/${chunkCount} bytes=${audio.size} durationSeconds=${durationSeconds.toFixed(2)} startTime=${startTime.toFixed(2)} mediaType=${mediaType} name=${audio.name}`
  );

  try {
    const bytes = new Uint8Array(await audio.arrayBuffer());
    const mom = await generateMomFromAudio(bytes, mediaType, audio.name);

    if (mom.includes(NO_SPEECH_SENTINEL)) {
      return errorResponse(
        "Tidak terdeteksi percakapan yang jelas pada bagian rekaman ini. Periksa hasil kompresi atau coba file lain.",
        422,
        "NO_SPEECH"
      );
    }

    if (!mom) {
      return errorResponse(
        "Gemini tidak menghasilkan MoM dari rekaman ini. Coba gunakan file lain.",
        502
      );
    }

    return Response.json({ mom } satisfies TranscribeMomResponse);
  } catch (error) {
    return errorResponse(describeGeminiError(error), 502);
  }
}
