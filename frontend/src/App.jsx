import { lazy, Suspense } from 'react'
import { Navigate, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Editor from './pages/Editor.jsx'
import DemoEditor from './pages/DemoEditor.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import VerifyEmail from './pages/VerifyEmail.jsx'
import Settings from './pages/Settings.jsx'
import SharedLink from './pages/SharedLink.jsx'
import InviteBanner from './components/InviteBanner.jsx'
import { useApp } from './context/AppContext.jsx'

function ProtectedRoute({ children }) {
  const { isAuthenticated, authLoading } = useApp()
  if (authLoading) return <div className="auth-loading"><span className="auth-spinner" /></div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

function GuestRoute({ children }) {
  const { isAuthenticated, authLoading } = useApp()
  if (authLoading) return <div className="auth-loading"><span className="auth-spinner" /></div>
  if (isAuthenticated) return <Navigate to="/app" replace />
  return children
}

export default function App() {
  const { isAuthenticated } = useApp()

  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/login"
          element={
            <GuestRoute>
              <Login />
            </GuestRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <GuestRoute>
              <Signup />
            </GuestRoute>
          }
        />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doc/:docId"
          element={
            <ProtectedRoute>
              <Editor />
            </ProtectedRoute>
          }
        />
        <Route path="/shared/:token" element={<SharedLink />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/demo" element={<DemoEditor />} />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
      </Routes>
      {isAuthenticated && <InviteBanner />}
    </>
  )
}
