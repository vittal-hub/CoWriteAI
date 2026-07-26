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
  // Reports the caret's actual screen position (viewport coordinates) for
  // collaborative cursor broadcasting — this is the real text-cursor position,
  // not a mouse position, so it tracks typing, arrow keys, clicks, and
  // selection changes alike.
  function reportCursorPosition(editorInstance) {
    if (!onCursorMove) return
    try {
      const { from } = editorInstance.state.selection
      const coords = editorInstance.view.coordsAtPos(from)
      onCursorMove({ top: coords.top, left: coords.left, bottom: coords.bottom })
    } catch {
      // Position not yet measurable (e.g. immediately on mount) — the next
      // selection update will report a valid one.
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
      // Paragraph breaks become blank lines and hard breaks become newlines, so
      // multi-paragraph selections keep their structure when sent to the AI.
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
    if (editor && content !== editor.getHTML() && !editor.isFocused) {
      editor.commands.setContent(content, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content])

  return (
    <div className="rich-editor" spellCheck="true">
      <EditorContent editor={editor} />
    </div>
  )
}
