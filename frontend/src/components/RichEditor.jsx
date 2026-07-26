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
