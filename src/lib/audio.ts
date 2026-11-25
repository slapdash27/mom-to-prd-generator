import {
  AUDIO_FILE_EXTENSIONS,
  AUDIO_MIME_TYPES,
  MAX_AUDIO_UPLOAD_SIZE,
  MAX_COMPRESSED_AUDIO_FILE_SIZE,
  type AudioFileExtension,
} from "@/types/prd";

export function getAudioFileExtension(fileName: string): AudioFileExtension | null {
  const lowerName = fileName.toLowerCase();

  return (
    AUDIO_FILE_EXTENSIONS.find((extension) => lowerName.endsWith(extension)) ??
    null
  );
}

export function getAudioMimeType(fileName: string): string | null {
  const extension = getAudioFileExtension(fileName);

  return extension ? AUDIO_MIME_TYPES[extension] : null;
}

export function validateAudioUpload(file: File): string | null {
  if (!getAudioFileExtension(file.name)) {
    return "Format rekaman tidak didukung. Gunakan .mp3, .m4a, .wav, .ogg, atau .webm.";
  }

  if (file.size === 0) {
    return "File rekaman kosong. Pilih file audio yang berisi rapat.";
  }

  if (file.size > MAX_AUDIO_UPLOAD_SIZE) {
    return `Ukuran rekaman melebihi batas ${MAX_AUDIO_UPLOAD_SIZE / (1024 * 1024)} MB. Kompres atau potong audio lalu coba lagi.`;
  }

  return null;
}

export function validateCompressedAudioFile(file: File): string | null {
  if (!getAudioFileExtension(file.name)) {
    return "Format rekaman tidak didukung.";
  }

  if (file.size === 0) {
    return "File rekaman kosong setelah kompresi.";
  }

  if (file.size > MAX_COMPRESSED_AUDIO_FILE_SIZE) {
    return `Hasil kompresi melebihi batas ${(MAX_COMPRESSED_AUDIO_FILE_SIZE / (1024 * 1024)).toFixed(1)} MB untuk dikirim ke server. Potong rekaman menjadi bagian lebih pendek lalu coba lagi.`;
  }

  return null;
}

// Backward-compatible alias
export const validateAudioFile = validateAudioUpload;
