export const MIN_MOM_LENGTH = 20;

export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

export interface GeneratePrdRequest {
  prompt: string;
}

export interface GeneratePrdErrorResponse {
  error: string;
}

export type PrdGenerationStatus = "idle" | "streaming" | "complete" | "error";

export type PrdViewMode = "preview" | "edit";
