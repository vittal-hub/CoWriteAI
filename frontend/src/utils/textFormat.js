// Converts AI rewrite output (plain text with \n\n paragraph breaks and \n line breaks,
// mirroring what RichEditor's textBetween extraction produces) back into HTML so
// TipTap's insertContent() reconstructs real paragraph/line-break nodes instead of
// collapsing embedded newlines the way raw-string HTML parsing would.

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function rewriteTextToInsertableHtml(text) {
  const trimmed = (text || '').trim()
  if (!trimmed) return ''

  const paragraphs = trimmed
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)

  // Single paragraph: insert as inline content so it merges into the surrounding
  // paragraph at the selection point instead of forcing a block split.
  if (paragraphs.length <= 1) {
    return escapeHtml(trimmed).replace(/\n/g, '<br>')
  }

  return paragraphs.map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('')
}
