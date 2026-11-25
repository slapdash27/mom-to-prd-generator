export const MIN_MOM_LENGTH = 20;

export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
export const DEFAULT_TRANSCRIBE_MODEL = DEFAULT_GEMINI_MODEL;
export const FALLBACK_TRANSCRIBE_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
] as const;

export const MAX_AUDIO_UPLOAD_SIZE = 25 * 1024 * 1024;
export const MAX_COMPRESSED_AUDIO_FILE_SIZE = 4.2 * 1024 * 1024;
export const MAX_TRANSCRIBE_CHUNK_SIZE = 4 * 1024 * 1024;
export const COMPRESS_SKIP_THRESHOLD_BYTES = 3.5 * 1024 * 1024;

export const MP3_SAMPLE_RATE = 16_000;
export const MP3_BITRATE_KBPS = 48;
export const MP3_BITRATE_OPTIONS = [48, 40, 32, 24, 16, 8] as const;
export const AUDIO_CHUNK_SECONDS = 360;
export const SILENCE_PEAK_THRESHOLD = 0.01;
export const SILENCE_RMS_THRESHOLD = 0.001;
export const NO_SPEECH_SENTINEL = "TIDAK_ADA_PERCAKAPAN";

// Backward-compatible alias for existing imports
export const MAX_AUDIO_FILE_SIZE = MAX_AUDIO_UPLOAD_SIZE;

export const AUDIO_FILE_EXTENSIONS = [
  ".mp3",
  ".m4a",
  ".wav",
  ".ogg",
  ".webm",
] as const;

export type AudioFileExtension = (typeof AUDIO_FILE_EXTENSIONS)[number];

export const AUDIO_FILE_ACCEPT = `${AUDIO_FILE_EXTENSIONS.join(",")},audio/*`;

export const AUDIO_MIME_TYPES: Record<AudioFileExtension, string> = {
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".webm": "audio/webm",
};

export interface GeneratePrdRequest {
  prompt: string;
}

export interface GeneratePrdErrorResponse {
  error: string;
}

export interface AudioChunk {
  file: File;
  startTime: number;
  durationSeconds: number;
}

export interface TranscribeProgress {
  uploadedBytes: number;
  totalBytes: number;
  completedChunks: number;
  totalChunks: number;
}

export interface TranscribeMomResponse {
  mom: string;
}

export type TranscribeMomErrorCode = "NO_SPEECH";

export interface TranscribeMomErrorResponse {
  error: string;
  code?: TranscribeMomErrorCode;
}

export type PrdGenerationStatus = "idle" | "streaming" | "complete" | "error";

export type PrdViewMode = "preview" | "edit";
