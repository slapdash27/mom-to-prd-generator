"use client";

import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Table2,
  Undo2,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import { Markdown } from "tiptap-markdown";
import type { MarkdownStorage } from "tiptap-markdown";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

declare module "@tiptap/core" {
  interface Storage {
    markdown: MarkdownStorage;
  }
}

interface PrdVisualEditorProps {
  markdown: string;
  onMarkdownChange: (value: string) => void;
}

function toMarkdown(editor: Editor): string {
  return editor.storage.markdown.getMarkdown();
}

export function PrdVisualEditor({
  markdown,
  onMarkdownChange,
}: PrdVisualEditorProps) {
  const lastMarkdownRef = useRef(markdown);
  const loadedEditorRef = useRef<Editor | null>(null);

  const editor = useEditor(
    {
      immediatelyRender: false,
      shouldRerenderOnTransaction: true,
      extensions: [
        StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        Markdown.configure({
          html: false,
          tightLists: true,
          bulletListMarker: "-",
        }),
      ],
      content: markdown,
      editorProps: {
        attributes: {
          class: "prose prose-sm max-w-none min-h-[400px] outline-none",
        },
      },
      onUpdate: ({ editor: updatedEditor }) => {
        const nextMarkdown = toMarkdown(updatedEditor);
        lastMarkdownRef.current = nextMarkdown;
        onMarkdownChange(nextMarkdown);
      },
    },
    [onMarkdownChange]
  );

  useEffect(() => {
    if (!editor) return;

    if (loadedEditorRef.current !== editor) {
      loadedEditorRef.current = editor;
      lastMarkdownRef.current = markdown;
      editor.commands.setContent(markdown, { emitUpdate: false });
      return;
    }

    if (markdown === lastMarkdownRef.current) return;

    lastMarkdownRef.current = markdown;
    editor.commands.setContent(markdown, { emitUpdate: false });
  }, [editor, markdown]);

  if (!editor) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-7 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const isBold = editor.isActive("bold");
  const isItalic = editor.isActive("italic");
  const isBulletList = editor.isActive("bulletList");
  const isOrderedList = editor.isActive("orderedList");
  const isQuote = editor.isActive("blockquote");
  const isHeading1 = editor.isActive("heading", { level: 1 });
  const isHeading2 = editor.isActive("heading", { level: 2 });
  const isHeading3 = editor.isActive("heading", { level: 3 });
  const canUndo = editor.can().undo();
  const canRedo = editor.can().redo();

  return (
    <div className="flex h-full min-h-64 flex-col">
      <div className="prd-toolbar flex flex-wrap items-center gap-1 border-b bg-muted/40 p-2">
        <Button
          type="button"
          size="icon-xs"
          variant={isHeading1 ? "secondary" : "ghost"}
          title="Heading 1"
          aria-label="Heading 1"
          aria-pressed={isHeading1}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        >
          <Heading1 />
        </Button>
        <Button
          type="button"
          size="icon-xs"
          variant={isHeading2 ? "secondary" : "ghost"}
          title="Heading 2"
          aria-label="Heading 2"
          aria-pressed={isHeading2}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 />
        </Button>
        <Button
          type="button"
          size="icon-xs"
          variant={isHeading3 ? "secondary" : "ghost"}
          title="Heading 3"
          aria-label="Heading 3"
          aria-pressed={isHeading3}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <Heading3 />
        </Button>
        <Button
          type="button"
          size="icon-xs"
          variant={isBold ? "secondary" : "ghost"}
          title="Tebal"
          aria-label="Tebal"
          aria-pressed={isBold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold />
        </Button>
        <Button
          type="button"
          size="icon-xs"
          variant={isItalic ? "secondary" : "ghost"}
          title="Miring"
          aria-label="Miring"
          aria-pressed={isItalic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic />
        </Button>
        <Button
          type="button"
          size="icon-xs"
          variant={isBulletList ? "secondary" : "ghost"}
          title="Daftar poin"
          aria-label="Daftar poin"
          aria-pressed={isBulletList}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List />
        </Button>
        <Button
          type="button"
          size="icon-xs"
          variant={isOrderedList ? "secondary" : "ghost"}
          title="Daftar bernomor"
          aria-label="Daftar bernomor"
          aria-pressed={isOrderedList}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered />
        </Button>
        <Button
          type="button"
          size="icon-xs"
          variant={isQuote ? "secondary" : "ghost"}
          title="Kutipan"
          aria-label="Kutipan"
          aria-pressed={isQuote}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote />
        </Button>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          title="Garis pemisah"
          aria-label="Garis pemisah"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus />
        </Button>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          title="Sisipkan tabel"
          aria-label="Sisipkan tabel"
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
        >
          <Table2 />
        </Button>
        <span className="mx-1 h-4 w-px bg-border" />
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          title="Urungkan"
          aria-label="Urungkan"
          disabled={!canUndo}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 />
        </Button>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          title="Ulangi"
          aria-label="Ulangi"
          disabled={!canRedo}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 />
        </Button>
      </div>
      <div className="prd-wysiwyg prose prose-sm max-w-none min-h-0 flex-1 overflow-y-auto bg-background p-4">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
