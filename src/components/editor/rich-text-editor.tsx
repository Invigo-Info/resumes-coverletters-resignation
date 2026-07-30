"use client";

import { forwardRef, useEffect, useImperativeHandle } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
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
 * top-level paragraphs in document order, matching how the preview enumerates
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
 * Apply a link to the current selection from a prompted URL.
 *
 * Fixes what a naive setLink misses: a bare domain (example.com) gets an https://
 * scheme so it becomes a real absolute link instead of a broken relative one; an
 * empty prompt clears an existing link; and with NO text selected the URL is
 * inserted as its own linked text rather than silently doing nothing. The link
 * is styled (primary color + underline) via the editor content classes.
 */
function setLinkOnEditor(editor: NonNullable<ReturnType<typeof useEditor>>) {
  const prev = (editor.getAttributes("link").href as string | undefined) ?? "";
  const input = window.prompt("Enter URL", prev);
  if (input === null) return; // cancelled - leave the text untouched
  const raw = input.trim();
  if (!raw) {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }
  const href = /^(https?:\/\/|mailto:|tel:)/i.test(raw) ? raw : `https://${raw}`;
  if (editor.state.selection.empty) {
    // No selection: drop the URL in as its own linked, clickable text.
    const safeText = raw
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const safeHref = href.replace(/"/g, "%22");
    editor.chain().focus().insertContent(`<a href="${safeHref}">${safeText}</a> `).run();
  } else {
    // Extend across the whole existing link (if any) so re-linking replaces it.
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }
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

/** Imperative handle for callers that need the current text selection (e.g. the
 *  summary's selected-text AI editing). */
export interface RichTextEditorHandle {
  /** The currently selected plain text (empty when the caret is collapsed). */
  getSelectionInfo(): { hasSelection: boolean; selectedText: string };
  /** Replace the current selection in place with plain text, then focus. */
  replaceSelection(text: string): void;
  /** Undo the last edit (used to revert an applied AI selection edit). */
  undo(): void;
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Optional slot rendered at the top-right of the toolbar (e.g. an AI button). */
  toolbarRight?: React.ReactNode;
  minHeight?: number;
  /** Reports the bullet/paragraph the caret is in (for preview highlighting). */
  onActiveBlockChange?: (index: number | null) => void;
}

/**
 * Tiptap-backed rich text editor with a small formatting toolbar (bold, italic,
 * lists, link). Emits HTML on change and reports which block the caret is in so
 * the live preview can highlight the matching bullet/paragraph. Exposes a small
 * imperative handle for selected-text AI editing.
 */
export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  function RichTextEditor(
    { value, onChange, placeholder, toolbarRight, minHeight = 120, onActiveBlockChange },
    ref
  ) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      // StarterKit already bundles Link; registering it separately made Tiptap
      // warn "Duplicate extension names found: ['link']". Configure it here.
      StarterKit.configure({ heading: false, link: { openOnClick: false } }),
      // Without this the `placeholder` prop renders nothing: the data attribute
      // alone has no styling behind it.
      Placeholder.configure({ placeholder: placeholder ?? "" }),
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

  useImperativeHandle(
    ref,
    () => ({
      getSelectionInfo() {
        if (!editor) return { hasSelection: false, selectedText: "" };
        const { from, to } = editor.state.selection;
        const selectedText = editor.state.doc.textBetween(from, to, " ").trim();
        return { hasSelection: selectedText.length > 0, selectedText };
      },
      replaceSelection(text) {
        if (!editor) return;
        const { from, to } = editor.state.selection;
        // Splice plain text into the selected range (ProseMirror positions, so
        // surrounding formatting is preserved) and keep focus for a natural flow.
        editor.chain().focus().insertContentAt({ from, to }, text).run();
      },
      undo() {
        editor?.chain().focus().undo().run();
      },
    }),
    [editor]
  );

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
      {/* Wraps so the format buttons plus the AI controls never force the card
          wider than a 280px screen. */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1.5">
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
          onClick={() => setLinkOnEditor(editor)}
        >
          <LinkIcon className="size-4" />
        </ToolbarButton>

        {toolbarRight && <div className="ml-auto">{toolbarRight}</div>}
      </div>

      <EditorContent
        editor={editor}
        style={{ minHeight }}
        className="px-3 py-2.5 text-sm text-foreground [&_.tiptap]:min-h-[inherit] [&_ul]:ml-4 [&_ul]:list-disc [&_ol]:ml-4 [&_ol]:list-decimal [&_a]:cursor-pointer [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2"
      />
    </div>
  );
  }
);
