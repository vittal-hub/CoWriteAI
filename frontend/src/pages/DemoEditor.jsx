import Editor from './Editor.jsx'

// Public, unauthenticated entry point ("Try Demo" on the Landing Page).
// Reuses the real Editor page entirely — demoMode swaps out every
// backend-dependent code path for local-only behavior. See Editor.jsx.
export default function DemoEditor() {
  return <Editor demoMode />
}
