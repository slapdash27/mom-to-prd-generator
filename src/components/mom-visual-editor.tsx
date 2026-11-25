"use client";

import { Bold, Heading2, Italic, List, ListOrdered, Redo2, Undo2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { Placeholder } from "@tiptap/extensions";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import type { MarkdownStorage } from "tiptap-markdown";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

declare module "@tiptap/core" {
  interface Storage {
    markdown: MarkdownStorage;
  }
}

interface MomVisualEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function toMarkdown(editor: Editor): string {
  return editor.storage.markdown.getMarkdown();
}

export function MomVisualEditor({
  value,
  onChange,
  disabled = false,
}: MomVisualEditorProps) {
  const lastValueRef = useRef(value);
  const loadedEditorRef = useRef<Editor | null>(null);

  const editor = useEditor(
    {
      immediatelyRender: false,
      shouldRerenderOnTransaction: true,
      editable: !disabled,
      extensions: [
        StarterKit.configure({ heading: { levels: [2, 3] } }),
        Placeholder.configure({
          placeholder:
            "Contoh:\n## Topik Rapat\nDiskusi fitur riwayat transaksi.\n\n## Poin Pembahasan Utama\n- Pengguna sulit menemukan riwayat transaksi...",
        }),
        Markdown.configure({
          html: false,
          tightLists: true,
          bulletListMarker: "-",
          transformPastedText: true,
          transformCopiedText: true,
        }),
      ],
      content: value,
      editorProps: {
        attributes: {
          class: "prose prose-sm max-w-none outline-none",
          "aria-label": "Catatan rapat (MoM)",
        },
      },
      onUpdate: ({ editor: updatedEditor }) => {
        const nextValue = toMarkdown(updatedEditor);
        lastValueRef.current = nextValue;
        onChange(nextValue);
      },
    },
    [onChange]
  );

  useEffect(() => {
    if (!editor) return;

    if (loadedEditorRef.current !== editor) {
      loadedEditorRef.current = editor;
      lastValueRef.current = value;
      editor.commands.setContent(value, { emitUpdate: false });
      return;
    }

    if (value === lastValueRef.current) return;

    lastValueRef.current = value;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) {
    return (
      <div className="flex min-h-64 flex-1 flex-col gap-2 rounded-md border bg-background p-3 lg:min-h-0">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
      </div>
    );
  }

  const canUndo = editor.can().undo();
  const canRedo = editor.can().redo();

  return (
    <div className="mom-wysiwyg flex min-h-64 flex-1 flex-col overflow-hidden rounded-md border bg-background lg:min-h-0">
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 p-1.5">
        <Button
          type="button"
          size="icon-xs"
          variant={
            editor.isActive("heading", { level: 2 }) ? "secondary" : "ghost"
          }
          title="Judul section"
          aria-label="Judul section"
          aria-pressed={editor.isActive("heading", { level: 2 })}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 />
        </Button>
        <Button
          type="button"
          size="icon-xs"
          variant={editor.isActive("bold") ? "secondary" : "ghost"}
          title="Tebal"
          aria-label="Tebal"
          aria-pressed={editor.isActive("bold")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold />
        </Button>
        <Button
          type="button"
          size="icon-xs"
          variant={editor.isActive("italic") ? "secondary" : "ghost"}
          title="Miring"
          aria-label="Miring"
          aria-pressed={editor.isActive("italic")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic />
        </Button>
        <Button
          type="button"
          size="icon-xs"
          variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
          title="Daftar poin"
          aria-label="Daftar poin"
          aria-pressed={editor.isActive("bulletList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List />
        </Button>
        <Button
          type="button"
          size="icon-xs"
          variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
          title="Daftar bernomor"
          aria-label="Daftar bernomor"
          aria-pressed={editor.isActive("orderedList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered />
        </Button>
        <span className="mx-1 h-4 w-px bg-border" />
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          title="Urungkan"
          aria-label="Urungkan"
          disabled={disabled || !canUndo}
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
          disabled={disabled || !canRedo}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
