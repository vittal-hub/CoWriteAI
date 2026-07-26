import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import FontFamily from '@tiptap/extension-font-family'
import TextStyle from '@tiptap/extension-text-style'
import { useEffect } from 'react'
import './RichEditor.css'

const CustomTextStyle = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element) => {
          const style = element.getAttribute('style') || ''
          const match = style.match(/font-size:\s*([^;]+)/)
          return match ? match[1] : null
        },
        renderHTML: (attributes) => {
          if (!attributes.fontSize) return {}
          return {
            style: `font-size: ${attributes.fontSize}`,
          }
        },
      },
    }
  },
})

export default function RichEditor({ content, onChange, onSelectionChange, onCursorMove, editorRef, onReady }) {
  // Reports the caret's screen position (not mouse position) for collaborative cursor broadcasting.
  function reportCursorPosition(editorInstance) {
    if (!onCursorMove) return
    try {
      const { from } = editorInstance.state.selection
      const coords = editorInstance.view.coordsAtPos(from)
      onCursorMove({ top: coords.top, left: coords.left, bottom: coords.bottom })
    } catch {
      // Not yet measurable (e.g. on mount) — the next selection update will report a valid one.
    }
  }

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      CustomTextStyle,
      FontFamily,
      Placeholder.configure({ placeholder: 'Start writing, or switch to pencil, mic, or AI above…' }),
    ],
    content,
    onCreate: ({ editor }) => reportCursorPosition(editor),
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection
      // Preserves paragraph/line structure so multi-paragraph selections stay readable for the AI.
      const text = editor.state.doc.textBetween(from, to, '\n\n', '\n')
      onSelectionChange({ text, from, to })
      reportCursorPosition(editor)
    },
  })

  useEffect(() => {
    if (editor) {
      editorRef.current = editor
      onReady?.(editor)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  useEffect(() => {
    if (!editor || content === editor.getHTML()) return

    // Previously skipped this entirely whenever the local user had focus —
    // meant to avoid clobbering their cursor position mid-keystroke, but it
    // silently dropped every remote collaborator's update for as long as this
    // user was actively typing (i.e. most of a real editing session), which
    // is why text sync looked "sometimes" broken while cursors (no such
    // guard) kept working fine. Applying it unconditionally and restoring
    // the local selection afterwards (clamped to the new document's size, in
    // case the incoming content is shorter) keeps remote edits flowing in
    // real time without visibly disrupting local typing.
    const wasFocused = editor.isFocused
    const { from, to } = editor.state.selection
    editor.commands.setContent(content, false)
    if (wasFocused) {
      const size = editor.state.doc.content.size
      const clamp = (pos) => Math.max(0, Math.min(pos, size))
      editor.commands.setTextSelection({ from: clamp(from), to: clamp(to) })
      editor.commands.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content])

  return (
    <div className="rich-editor" spellCheck="true">
      <EditorContent editor={editor} />
    </div>
  )
}
