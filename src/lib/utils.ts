export { cn } from "cn";

import type {
  ITableBordersOptions,
  Paragraph as DocxParagraph,
  ParagraphChild,
  Table as DocxTable,
} from "docx";

type DocxModule = typeof import("docx");
type DocxBlock = DocxParagraph | DocxTable;

function slugify(value: string): string {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "prd"
  );
}

function getPrdBaseName(markdown: string): string {
  const title = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "PRD";
  return slugify(title);
}

export function getPrdFileName(
  markdown: string,
  extension: "md" | "docx" | "pdf" = "md"
): string {
  return `${getPrdBaseName(markdown)}.${extension}`;
}

export function downloadMarkdown(markdown: string, fileName?: string): void {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName ?? getPrdFileName(markdown);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

interface InlineStyle {
  bold?: boolean;
  italics?: boolean;
  color?: string;
}

function buildInlineRuns(
  docx: DocxModule,
  text: string,
  style: InlineStyle = {}
): ParagraphChild[] {
  const runs: ParagraphChild[] = [];
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|`[^`]+`)/g;
  let lastIndex = 0;

  function pushText(value: string, overrides: InlineStyle = {}) {
    runs.push(
      new docx.TextRun({
        text: value,
        bold: overrides.bold ?? style.bold,
        italics: overrides.italics ?? style.italics,
        color: overrides.color ?? style.color,
      })
    );
  }

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;

    if (index > lastIndex) {
      pushText(text.slice(lastIndex, index));
    }

    const token = match[0];

    if (token.startsWith("**") || token.startsWith("__")) {
      pushText(token.slice(2, -2), { bold: true });
    } else if (token.startsWith("`")) {
      runs.push(
        new docx.TextRun({
          text: token.slice(1, -1),
          font: "Consolas",
          color: style.color ?? "333333",
        })
      );
    } else {
      pushText(token.slice(1, -1), { italics: true });
    }

    lastIndex = index + token.length;
  }

  if (lastIndex < text.length) {
    pushText(text.slice(lastIndex));
  }

  if (runs.length === 0) {
    runs.push(new docx.TextRun(""));
  }

  return runs;
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  return /^\|?[\s:|-]+\|?$/.test(line) && line.includes("-");
}

function buildDocxBlocks(docx: DocxModule, markdown: string): DocxBlock[] {
  const {
    AlignmentType,
    BorderStyle,
    HeadingLevel,
    Paragraph,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
  } = docx;

  const headingMap = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
    4: HeadingLevel.HEADING_4,
    5: HeadingLevel.HEADING_5,
    6: HeadingLevel.HEADING_6,
  } as const;

  const border = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: "A6A6A6",
  } as const;

  const tableBorders: ITableBordersOptions = {
    top: border,
    bottom: border,
    left: border,
    right: border,
    insideHorizontal: border,
    insideVertical: border,
  };

  const cellMargins = { top: 80, bottom: 80, left: 100, right: 100 };

  const blocks: DocxBlock[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let paragraphBuffer: string[] = [];
  let index = 0;

  function flushParagraph() {
    const text = paragraphBuffer.join(" ").trim();
    paragraphBuffer = [];

    if (text) {
      blocks.push(
        new Paragraph({
          children: buildInlineRuns(docx, text),
          spacing: { after: 160 },
          alignment: AlignmentType.LEFT,
        })
      );
    }
  }

  while (index < lines.length) {
    const line = lines[index].trim();

    if (!line) {
      flushParagraph();
      index += 1;
      continue;
    }

    if (line.startsWith("|")) {
      flushParagraph();
      const tableLines: string[] = [];

      while (index < lines.length && lines[index].trim().startsWith("|")) {
        tableLines.push(lines[index].trim());
        index += 1;
      }

      const rows = tableLines
        .filter((tableLine) => !isTableSeparator(tableLine))
        .map(splitTableRow);

      if (rows.length > 0) {
        const [header, ...body] = rows;

        blocks.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBorders,
            rows: [
              new TableRow({
                tableHeader: true,
                children: header.map(
                  (cell) =>
                    new TableCell({
                      shading: { fill: "EDEDED" },
                      margins: cellMargins,
                      children: [
                        new Paragraph({
                          children: buildInlineRuns(docx, cell, {
                            bold: true,
                          }),
                          spacing: { after: 0 },
                        }),
                      ],
                    })
                ),
              }),
              ...body.map(
                (row) =>
                  new TableRow({
                    children: row.map(
                      (cell) =>
                        new TableCell({
                          margins: cellMargins,
                          children: [
                            new Paragraph({
                              children: buildInlineRuns(docx, cell),
                              spacing: { after: 0 },
                            }),
                          ],
                        })
                    ),
                  })
              ),
            ],
          })
        );
      }

      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);

    if (heading) {
      flushParagraph();
      const level = heading[1].length as keyof typeof headingMap;

      blocks.push(
        new Paragraph({
          heading: headingMap[level],
          children: buildInlineRuns(docx, heading[2]),
          spacing: { before: 240, after: 120 },
        })
      );
      index += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flushParagraph();
      blocks.push(
        new Paragraph({
          border: {
            bottom: {
              style: BorderStyle.SINGLE,
              size: 6,
              color: "BFBFBF",
              space: 1,
            },
          },
          spacing: { after: 160 },
        })
      );
      index += 1;
      continue;
    }

    if (line.startsWith(">")) {
      flushParagraph();
      const quoteLines: string[] = [];

      while (index < lines.length && lines[index].trim().startsWith(">")) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }

      blocks.push(
        new Paragraph({
          children: buildInlineRuns(docx, quoteLines.join(" "), {
            italics: true,
            color: "404040",
          }),
          indent: { left: 360 },
          border: {
            left: {
              style: BorderStyle.SINGLE,
              size: 18,
              color: "BFBFBF",
              space: 12,
            },
          },
          spacing: { after: 160 },
        })
      );
      continue;
    }

    const bullet = line.match(/^[-*+]\s+(.*)$/);

    if (bullet) {
      flushParagraph();
      blocks.push(
        new Paragraph({
          bullet: { level: 0 },
          children: buildInlineRuns(docx, bullet[1]),
          spacing: { after: 60 },
        })
      );
      index += 1;
      continue;
    }

    const ordered = line.match(/^(\d+)[.)]\s+(.*)$/);

    if (ordered) {
      flushParagraph();
      blocks.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [
            new TextRun({ text: `${ordered[1]}. `, bold: true }),
            ...buildInlineRuns(docx, ordered[2]),
          ],
          spacing: { after: 60 },
        })
      );
      index += 1;
      continue;
    }

    paragraphBuffer.push(line);
    index += 1;
  }

  flushParagraph();

  return blocks;
}

export async function buildDocxBlob(markdown: string): Promise<Blob> {
  const docx = await import("docx");

  const document = new docx.Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22 },
          paragraph: { spacing: { line: 276 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: docx.convertMillimetersToTwip(20),
              right: docx.convertMillimetersToTwip(18),
              bottom: docx.convertMillimetersToTwip(20),
              left: docx.convertMillimetersToTwip(18),
            },
          },
        },
        children: buildDocxBlocks(docx, markdown),
      },
    ],
  });

  return docx.Packer.toBlob(document);
}

export async function downloadDocx(markdown: string): Promise<void> {
  const [{ saveAs }, blob] = await Promise.all([
    import("file-saver"),
    buildDocxBlob(markdown),
  ]);

  saveAs(blob, getPrdFileName(markdown, "docx"));
}

export function exportToPdf(markdown: string): void {
  if (typeof window === "undefined") return;

  const previousTitle = document.title;
  document.title = getPrdFileName(markdown, "pdf").replace(/\.pdf$/, "");

  let restored = false;
  const restoreTitle = () => {
    if (restored) return;
    restored = true;
    document.title = previousTitle;
    window.removeEventListener("afterprint", restoreTitle);
  };

  window.addEventListener("afterprint", restoreTitle);
  window.print();
  window.setTimeout(restoreTitle, 2000);
}
