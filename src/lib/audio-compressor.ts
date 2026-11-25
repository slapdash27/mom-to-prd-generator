import { Mp3Encoder } from "@breezystack/lamejs";
import {
  AUDIO_CHUNK_SECONDS,
  MAX_COMPRESSED_AUDIO_FILE_SIZE,
  MAX_TRANSCRIBE_CHUNK_SIZE,
  MP3_BITRATE_KBPS,
  MP3_BITRATE_OPTIONS,
  MP3_SAMPLE_RATE,
  SILENCE_PEAK_THRESHOLD,
  SILENCE_RMS_THRESHOLD,
  type AudioChunk,
} from "@/types/prd";

export const COMPRESS_SKIP_THRESHOLD_BYTES = 3.5 * 1024 * 1024;
export const TARGET_SAMPLE_RATE = MP3_SAMPLE_RATE;
export const MAX_COMPRESSED_FILE_SIZE = MAX_COMPRESSED_AUDIO_FILE_SIZE;

export type AudioCompressionStage =
  | "decoding"
  | "resampling"
  | "validating"
  | "encoding";

export interface AudioCompressionProgress {
  stage: AudioCompressionStage;
  progress: number;
}

export interface AudioSignalStats {
  sampleRate: number;
  durationSeconds: number;
  peak: number;
  rms: number;
}

export interface CompressAudioResult {
  chunks: AudioChunk[];
  compressed: boolean;
  originalSize: number;
  compressedSize: number;
  durationSeconds: number;
  peak: number;
  rms: number;
}

const MP3_BLOCK_SIZE = 1152;
const YIELD_EVERY_BLOCKS = 32;
const COMPRESSION_SIZE_SAFETY_RATIO = 0.95;

function selectBitrateIndex(durationSeconds: number): number {
  const usableBytes =
    MAX_COMPRESSED_AUDIO_FILE_SIZE * COMPRESSION_SIZE_SAFETY_RATIO;
  const maxKbps =
    (usableBytes * 8) / (Math.max(1, durationSeconds) * 1000);
  const index = MP3_BITRATE_OPTIONS.findIndex(
    (bitrate) => bitrate <= Math.min(MP3_BITRATE_KBPS, maxKbps)
  );

  return index >= 0 ? index : MP3_BITRATE_OPTIONS.length - 1;
}

function getAudioContextCtor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext ??
    null
  );
}

function getOfflineAudioContextCtor(): typeof OfflineAudioContext | null {
  if (typeof window === "undefined") return null;
  return (
    window.OfflineAudioContext ??
    (window as Window & { webkitOfflineAudioContext?: typeof OfflineAudioContext })
      .webkitOfflineAudioContext ??
    null
  );
}

function replaceExtension(name: string, ext: string): string {
  return `${name.replace(/\.[^.]+$/, "") || "rekaman"}${ext}`;
}

function chunkFileName(name: string, index: number, total: number): string {
  const base = name.replace(/\.[^.]+$/, "") || "rekaman";
  if (total <= 1) return `${base}.mp3`;
  return `${base}-bagian-${String(index + 1).padStart(2, "0")}.mp3`;
}

async function decodeAudioFile(
  file: File,
  onProgress: (p: AudioCompressionProgress) => void
): Promise<AudioBuffer> {
  onProgress({ stage: "decoding", progress: 0.05 });
  const Ctor = getAudioContextCtor();
  if (!Ctor) throw new Error("Browser tidak mendukung pemrosesan audio.");
  const ctx = new Ctor();
  try {
    const buf = await file.arrayBuffer();
    onProgress({ stage: "decoding", progress: 0.5 });
    const decoded = await ctx.decodeAudioData(buf.slice(0));
    onProgress({ stage: "decoding", progress: 1 });
    return decoded;
  } catch {
    throw new Error(
      "Rekaman tidak dapat dibaca oleh browser. Coba format .mp3, .m4a, .wav, .ogg, atau .webm."
    );
  } finally {
    void ctx.close().catch(() => undefined);
  }
}

function channelRms(data: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i += 1) {
    const sample = data[i];
    if (Number.isFinite(sample)) sum += sample * sample;
  }
  return Math.sqrt(sum / Math.max(1, data.length));
}

function createMonoInput(buffer: AudioBuffer): AudioBuffer {
  const Ctor = getOfflineAudioContextCtor();
  if (!Ctor) throw new Error("Browser tidak mendukung kompresi audio.");

  let loudestChannel = 0;
  let loudestRms = -1;
  for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
    const rms = channelRms(buffer.getChannelData(ch));
    if (rms > loudestRms) {
      loudestRms = rms;
      loudestChannel = ch;
    }
  }

  const offline = new Ctor(1, buffer.length, buffer.sampleRate);
  const mono = offline.createBuffer(1, buffer.length, buffer.sampleRate);
  mono.copyToChannel(buffer.getChannelData(loudestChannel), 0);
  return mono;
}

async function resampleToMono16k(
  buffer: AudioBuffer,
  onProgress: (p: AudioCompressionProgress) => void
): Promise<AudioBuffer> {
  onProgress({ stage: "resampling", progress: 0.1 });
  const Ctor = getOfflineAudioContextCtor();
  if (!Ctor) throw new Error("Browser tidak mendukung kompresi audio.");

  const frameCount = Math.max(
    1,
    Math.ceil(buffer.duration * MP3_SAMPLE_RATE)
  );
  const offline = new Ctor(1, frameCount, MP3_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = createMonoInput(buffer);
  source.connect(offline.destination);
  source.start(0);

  onProgress({ stage: "resampling", progress: 0.5 });
  const rendered = await offline.startRendering();
  onProgress({ stage: "resampling", progress: 1 });
  return rendered;
}

function analyzeSignal(buffer: AudioBuffer): AudioSignalStats {
  const data = buffer.getChannelData(0);
  let sum = 0;
  let peak = 0;

  for (let i = 0; i < data.length; i += 1) {
    const sample = data[i];
    if (!Number.isFinite(sample)) continue;
    const absolute = Math.abs(sample);
    if (absolute > peak) peak = absolute;
    sum += sample * sample;
  }

  return {
    sampleRate: buffer.sampleRate,
    durationSeconds: buffer.duration,
    peak,
    rms: Math.sqrt(sum / Math.max(1, data.length)),
  };
}

function assertAudible(stats: AudioSignalStats): void {
  if (
    !Number.isFinite(stats.durationSeconds) ||
    stats.durationSeconds <= 0
  ) {
    throw new Error("Durasi rekaman tidak valid. Pilih file rekaman lain.");
  }

  if (
    !Number.isFinite(stats.peak) ||
    !Number.isFinite(stats.rms) ||
    stats.peak < SILENCE_PEAK_THRESHOLD ||
    stats.rms < SILENCE_RMS_THRESHOLD
  ) {
    throw new Error(
      "Rekaman terdeteksi hening atau sangat pelan. Pastikan suara percakapan terdengar lalu coba lagi."
    );
  }
}

function sliceAudioBuffer(
  buffer: AudioBuffer,
  startFrame: number,
  endFrame: number
): AudioBuffer {
  const Ctor = getOfflineAudioContextCtor();
  if (!Ctor) throw new Error("Browser tidak mendukung kompresi audio.");

  const frameCount = endFrame - startFrame;
  const offline = new Ctor(1, frameCount, buffer.sampleRate);
  const slice = offline.createBuffer(1, frameCount, buffer.sampleRate);
  slice.copyToChannel(
    buffer.getChannelData(0).subarray(startFrame, endFrame),
    0
  );
  return slice;
}

function floatToPcm16(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, input[i]));
    output[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  return output;
}

function toUint8Array(input: Int8Array | Uint8Array): Uint8Array<ArrayBuffer> {
  const output = new Uint8Array(new ArrayBuffer(input.length));
  for (let i = 0; i < input.length; i += 1) {
    output[i] = input[i] & 0xff;
  }
  return output;
}

async function encodeChunkToMp3(
  buffer: AudioBuffer,
  fileName: string,
  bitrateKbps: number,
  baseFrames: number,
  totalFrames: number,
  onProgress: (p: AudioCompressionProgress) => void
): Promise<File> {
  const encoder = new Mp3Encoder(1, MP3_SAMPLE_RATE, bitrateKbps);
  const pcm = floatToPcm16(buffer.getChannelData(0));
  const encoded: Array<Uint8Array<ArrayBuffer>> = [];

  for (let offset = 0; offset < pcm.length; offset += MP3_BLOCK_SIZE) {
    const block = pcm.subarray(
      offset,
      Math.min(offset + MP3_BLOCK_SIZE, pcm.length)
    );
    const bytes = encoder.encodeBuffer(block);
    if (bytes.length > 0) encoded.push(toUint8Array(bytes));

    if ((offset / MP3_BLOCK_SIZE) % YIELD_EVERY_BLOCKS === 0) {
      const processedFrames = baseFrames + offset;
      onProgress({
        stage: "encoding",
        progress: Math.min(1, processedFrames / Math.max(1, totalFrames)),
      });
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }

  const flushed = encoder.flush();
  if (flushed.length > 0) encoded.push(toUint8Array(flushed));

  const file = new File(
    [new Blob(encoded, { type: "audio/mpeg" })],
    replaceExtension(fileName, ".mp3"),
    { type: "audio/mpeg" }
  );

  if (file.size > MAX_TRANSCRIBE_CHUNK_SIZE) {
    throw new Error(
      `Bagian audio terlalu besar (${(file.size / (1024 * 1024)).toFixed(1)} MB). Potong rekaman menjadi bagian lebih pendek lalu coba lagi.`
    );
  }

  return file;
}

export async function compressAudioFile(
  file: File,
  onProgress: (progress: AudioCompressionProgress) => void
): Promise<CompressAudioResult> {
  const decoded = await decodeAudioFile(file, onProgress);
  const resampled = await resampleToMono16k(decoded, onProgress);

  onProgress({ stage: "validating", progress: 0.5 });
  const stats = analyzeSignal(resampled);
  assertAudible(stats);
  onProgress({ stage: "validating", progress: 1 });

  const totalFrames = resampled.length;
  const chunkFrames = Math.max(1, Math.floor(AUDIO_CHUNK_SECONDS * MP3_SAMPLE_RATE));
  const chunkCount = Math.ceil(totalFrames / chunkFrames);
  let bitrateIndex = selectBitrateIndex(stats.durationSeconds);
  let chunks: AudioChunk[] = [];
  let compressedSize = 0;

  while (true) {
    const bitrateKbps = MP3_BITRATE_OPTIONS[bitrateIndex];
    chunks = [];

    for (let index = 0; index < chunkCount; index += 1) {
      const startFrame = index * chunkFrames;
      const endFrame = Math.min(totalFrames, startFrame + chunkFrames);
      const chunkBuffer = sliceAudioBuffer(resampled, startFrame, endFrame);
      const chunkFile = await encodeChunkToMp3(
        chunkBuffer,
        chunkFileName(file.name, index, chunkCount),
        bitrateKbps,
        startFrame,
        totalFrames,
        onProgress
      );

      chunks.push({
        file: chunkFile,
        startTime: startFrame / MP3_SAMPLE_RATE,
        durationSeconds: chunkBuffer.duration,
      });
      onProgress({
        stage: "encoding",
        progress: Math.min(1, endFrame / Math.max(1, totalFrames)),
      });
    }

    compressedSize = chunks.reduce((sum, chunk) => sum + chunk.file.size, 0);
    if (
      compressedSize <= MAX_COMPRESSED_AUDIO_FILE_SIZE ||
      bitrateIndex === MP3_BITRATE_OPTIONS.length - 1
    ) {
      break;
    }

    bitrateIndex += 1;
  }

  if (compressedSize > MAX_COMPRESSED_AUDIO_FILE_SIZE) {
    throw new Error(
      `Hasil kompresi masih terlalu besar (${(compressedSize / (1024 * 1024)).toFixed(1)} MB). Potong rekaman menjadi bagian lebih pendek lalu coba lagi.`
    );
  }

  return {
    chunks,
    compressed: true,
    originalSize: file.size,
    compressedSize,
    durationSeconds: stats.durationSeconds,
    peak: stats.peak,
    rms: stats.rms,
  };
}
