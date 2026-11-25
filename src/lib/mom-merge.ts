import { NO_SPEECH_SENTINEL } from "@/types/prd";

const SECTION_HEADINGS = [
  "Topik Rapat",
  "Poin Pembahasan Utama",
  "Keputusan yang Disepakati",
  "Action Items",
] as const;

type MomSection = (typeof SECTION_HEADINGS)[number];

type MergedMom = Record<MomSection, string[]>;

function emptyMom(): MergedMom {
  return {
    "Topik Rapat": [],
    "Poin Pembahasan Utama": [],
    "Keputusan yang Disepakati": [],
    "Action Items": [],
  };
}

function cleanLine(line: string): string | null {
  const cleaned = line.replace(/^[-*]\s+/, "").trim();
  if (!cleaned || cleaned === "-") return null;
  return cleaned;
}

function splitMom(mom: string): MergedMom {
  const sections = emptyMom();
  let current: MomSection | null = null;

  for (const rawLine of mom.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trim();

    if (line.startsWith("## ")) {
      const heading = line.slice(3).trim();
      current = (SECTION_HEADINGS as readonly string[]).includes(heading)
        ? (heading as MomSection)
        : null;
      continue;
    }

    if (!current) continue;

    const cleaned = cleanLine(line);
    if (cleaned) sections[current].push(cleaned);
  }

  return sections;
}

function pushUnique(target: string[], value: string): void {
  const key = value.toLocaleLowerCase("id-ID");
  if (target.some((existing) => existing.toLocaleLowerCase("id-ID") === key)) {
    return;
  }
  target.push(value);
}

export function mergeMomChunks(results: string[]): string {
  const merged = emptyMom();

  for (const result of results) {
    if (!result.trim() || result.includes(NO_SPEECH_SENTINEL)) continue;

    const sections = splitMom(result);
    for (const heading of SECTION_HEADINGS) {
      for (const line of sections[heading]) {
        pushUnique(merged[heading], line);
      }
    }
  }

  const topics = merged["Topik Rapat"].join(" ");
  const lines: string[] = ["## Topik Rapat", topics || "-"];

  for (const heading of SECTION_HEADINGS.slice(1)) {
    lines.push("", `## ${heading}`);
    const values = merged[heading];
    lines.push(...(values.length > 0 ? values.map((value) => `- ${value}`) : ["-"]));
  }

  return lines.join("\n");
}
