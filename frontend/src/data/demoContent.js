// Content shown in Demo Mode (Editor.jsx demoMode=true). Everything here is
// in-memory only — nothing is ever sent to the backend or MongoDB.

export const DEMO_TITLE = 'Welcome to CollabNoteAI'

export const DEMO_CONTENT = `
<h1>Welcome to CollabNoteAI</h1>
<p>This interactive demo lets you try the editor before creating an account. Everything on this page runs locally in your browser.</p>
<p><strong>Try it out:</strong></p>
<ul>
  <li>Edit this text, or add your own paragraphs and headings</li>
  <li>Use the toolbar for bold, italic, underline, and lists</li>
  <li>Switch to <strong>AI rewrite</strong> and clean up a sentence</li>
  <li>Switch to <strong>Voice</strong> and dictate a note</li>
  <li>Switch to <strong>Pencil</strong> and sketch a quick diagram</li>
  <li>Select some text and leave a comment in the panel on the right</li>
</ul>
<p>Your changes here are temporary and will not be saved — refresh the page at any time to reset this demo back to its original state.</p>
`

export const DEMO_PROFILE = {
  id: 'demo-user',
  name: 'You (Demo)',
  email: null,
  penIndex: 0,
  initials: 'YOU',
  avatarUrl: null,
}
