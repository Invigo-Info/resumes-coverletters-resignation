"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Index of the bullet/paragraph the caret sits in, counting list items and
 * top-level paragraphs in document order — matching how the preview enumerates
 * blocks. Returns -1 when nothing relevant is focused.
 */
function blockIndexAtSelection(editor: ReturnType<typeof useEditor>): number {
  if (!editor) return -1;
  const { from } = editor.state.selection;
  let idx = -1;
  let found = -1;
  editor.state.doc.descendants((node, pos) => {
    const name = node.type.name;
    if (name === "listItem" || name === "paragraph") {
      idx++;
      if (from >= pos && from <= pos + node.nodeSize) found = idx;
      return false; // don't double-count the paragraph inside a list item
    }
    return true; // descend into lists / blockquotes
  });
  return found;
}

/**
 * A single formatting button in the editor toolbar. Uses onMouseDown-preventDefault
 * so clicking it doesn't blur/move the caret before the command runs.
 */
function ToolbarButton({
  active,
  onClick,
  children,
  label,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        active && "bg-muted text-foreground"
      )}
    >
      {children}
    </button>
  );
}

/**
 * Tiptap-backed rich text editor with a small formatting toolbar (bold, italic,
 * lists, link). Emits HTML on change and reports which block the caret is in so
 * the live preview can highlight the matching bullet/paragraph.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  /** Optional slot rendered at the top-right of the toolbar (e.g. an AI button). */
  toolbarRight,
  minHeight = 120,
  /** Reports the bullet/paragraph the caret is in (for preview highlighting). */
  onActiveBlockChange,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  toolbarRight?: React.ReactNode;
  minHeight?: number;
  onActiveBlockChange?: (index: number | null) => void;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: false }),
      Link.configure({ openOnClick: false }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "tiptap focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onFocus: ({ editor }) =>
      onActiveBlockChange?.(blockIndexAtSelection(editor)),
    onSelectionUpdate: ({ editor }) =>
      onActiveBlockChange?.(blockIndexAtSelection(editor)),
  });

  // Reflect external value changes (AI inject, bullet insert) into the editor.
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div
        className="rounded-xl border border-border bg-card"
        style={{ minHeight: minHeight + 44 }}
      />
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        <ToolbarButton
          label="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Link"
          active={editor.isActive("link")}
          onClick={() => {
            // Prompt for a URL: a value sets the link; cancel/empty removes it.
            const url = window.prompt("Enter URL");
            if (url) editor.chain().focus().setLink({ href: url }).run();
            else editor.chain().focus().unsetLink().run();
          }}
        >
          <LinkIcon className="size-4" />
        </ToolbarButton>

        {toolbarRight && <div className="ml-auto">{toolbarRight}</div>}
      </div>

      <EditorContent
        editor={editor}
        style={{ minHeight }}
        className="px-3 py-2.5 text-sm text-foreground [&_.tiptap]:min-h-[inherit] [&_ul]:ml-4 [&_ul]:list-disc [&_ol]:ml-4 [&_ol]:list-decimal"
        data-placeholder={placeholder}
      />
    </div>
  );
}
