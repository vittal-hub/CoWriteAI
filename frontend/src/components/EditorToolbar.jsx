import {
  Type,
  PenLine,
  Mic,
  Sparkles,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Plus,
  Minus,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
} from 'lucide-react'
import './EditorToolbar.css'

export const MODES = { TEXT: 'text', PENCIL: 'pencil', MIC: 'mic', AI: 'ai' }

export const FONT_FAMILIES = [
  { label: 'Inter (Sans)', value: 'Inter, sans-serif' },
  { label: 'Bricolage (Display)', value: 'Bricolage Grotesque, sans-serif' },
  { label: 'Merriweather (Serif)', value: 'Merriweather, serif' },
  { label: 'Playfair (Editorial)', value: 'Playfair Display, serif' },
  { label: 'JetBrains (Mono)', value: 'JetBrains Mono, monospace' },
  { label: 'Caveat (Handwriting)', value: 'Caveat, cursive' },
  { label: 'Comic (Casual)', value: 'Comic Neue, sans-serif' },
]

export const FONT_SIZES = [
  '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'
]

export default function EditorToolbar({
  mode,
  setMode,
  editor,
  isEraser,
  setIsEraser,
  onClearDrawing,
  penColors,
  activePen,
  setActivePen,
  onUndoStrokes,
  onRedoStrokes,
}) {
  const currentFont = editor?.getAttributes('textStyle')?.fontFamily || ''
  const currentFontSize = editor?.getAttributes('textStyle')?.fontSize || ''

  function handleFontChange(e) {
    const val = e.target.value
    if (!editor) return
    if (val) {
      editor.chain().focus().setFontFamily(val).run()
    } else {
      editor.chain().focus().unsetFontFamily().run()
    }
  }

  function handleFontSizeChange(e) {
    const val = e.target.value
    if (!editor) return
    if (val) {
      editor.chain().focus().setMark('textStyle', { fontSize: val }).run()
    } else {
      editor.chain().focus().unsetMark('textStyle').run()
    }
  }

  function increaseFontSize() {
    if (!editor) return
    const currentSize = parseFloat(currentFontSize) || 16
    const newSize = `${Math.min(currentSize + 2, 32)}px`
    editor.chain().focus().setMark('textStyle', { fontSize: newSize }).run()
  }

  function decreaseFontSize() {
    if (!editor) return
    const currentSize = parseFloat(currentFontSize) || 16
    const newSize = `${Math.max(currentSize - 2, 12)}px`
    editor.chain().focus().setMark('textStyle', { fontSize: newSize }).run()
  }

  return (
    <div className="toolbar">
      <div className="toolbar__group">
        <ToolButton icon={Type} label="Text" active={mode === MODES.TEXT} onClick={() => setMode(MODES.TEXT)} />
        <ToolButton icon={PenLine} label="Pencil" active={mode === MODES.PENCIL} onClick={() => { setMode(MODES.PENCIL); setIsEraser?.(false); }} />
        <ToolButton icon={Mic} label="Voice" active={mode === MODES.MIC} onClick={() => setMode(MODES.MIC)} />
        <ToolButton
          icon={Sparkles}
          label="AI rewrite"
          active={mode === MODES.AI}
          onClick={() => setMode(MODES.AI)}
        />
      </div>

      {mode === MODES.TEXT && editor && (
        <div className="toolbar__group">
          {/* Font Family selector */}
          <div className="toolbar__select-wrap">
            <select
              className="toolbar__font-select"
              value={currentFont}
              onChange={handleFontChange}
              title="Font style"
            >
              <option value="">Font: Default</option>
              {FONT_FAMILIES.map((f) => (
                <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Font Size selector */}
          <div className="toolbar__select-wrap">
            <select
              className="toolbar__font-select"
              value={currentFontSize}
              onChange={handleFontSizeChange}
              title="Font size"
            >
              <option value="">Size: Default</option>
              {FONT_SIZES.map((size) => (
                <option key={size} value={size} style={{ fontSize: size }}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <MiniButton icon={Minus} onClick={decreaseFontSize} label="Decrease font size" />
          <MiniButton icon={Plus} onClick={increaseFontSize} label="Increase font size" />

          <span className="toolbar__divider" />

          <MiniButton icon={Bold} onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} label="Bold" />
          <MiniButton icon={Italic} onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} label="Italic" />
          <MiniButton icon={UnderlineIcon} onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} label="Underline" />
          <MiniButton icon={List} onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} label="Bullet list" />
          <MiniButton icon={ListOrdered} onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} label="Numbered list" />
          <span className="toolbar__divider" />
          <MiniButton icon={Undo2} onClick={() => editor.chain().focus().undo().run()} label="Undo" />
          <MiniButton icon={Redo2} onClick={() => editor.chain().focus().redo().run()} label="Redo" />
        </div>
      )}

      {mode === MODES.PENCIL && (
        <div className="toolbar__group">
          {/* Tool toggle: Pen vs Eraser */}
          <MiniButton
            icon={PenLine}
            active={!isEraser}
            onClick={() => setIsEraser?.(false)}
            label="Pen mode"
          />
          <MiniButton
            icon={Eraser}
            active={isEraser}
            onClick={() => setIsEraser?.(true)}
            label="Eraser mode"
          />

          <span className="toolbar__divider" />

          {!isEraser && penColors.map((c) => (
            <button
              key={c}
              className={`toolbar__swatch ${activePen === c ? 'toolbar__swatch--active' : ''}`}
              style={{ background: c }}
              onClick={() => setActivePen(c)}
              aria-label={`Pencil color ${c}`}
            />
          ))}

          {isEraser && <span className="toolbar__eraser-hint">Drag over strokes to erase</span>}
          
          <span className="toolbar__divider" />
          <MiniButton icon={Undo2} onClick={onUndoStrokes} label="Undo" />
          <MiniButton icon={Redo2} onClick={onRedoStrokes} label="Redo" />

          <span className="toolbar__divider" />
          <MiniButton icon={Trash2} onClick={onClearDrawing} label="Clear all drawings" />
        </div>
      )}
    </div>
  )
}

function ToolButton({ icon: Icon, label, active, onClick }) {
  return (
    <button className={`tool-btn ${active ? 'tool-btn--active' : ''}`} onClick={onClick} title={label}>
      <Icon size={17} />
      <span>{label}</span>
    </button>
  )
}

function MiniButton({ icon: Icon, active, onClick, label }) {
  return (
    <button className={`mini-btn ${active ? 'mini-btn--active' : ''}`} onClick={onClick} title={label} aria-label={label}>
      <Icon size={15} />
    </button>
  )
}
