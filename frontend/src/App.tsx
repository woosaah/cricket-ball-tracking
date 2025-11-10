import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Bowlers from './pages/Bowlers'
import BowlerProfile from './pages/BowlerProfile'
import Sessions from './pages/Sessions'
import SessionView from './pages/SessionView'
import UploadSession from './pages/UploadSession'
import Analytics from './pages/Analytics'
import VRPlaylists from './pages/VRPlaylists'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/bowlers" element={<Bowlers />} />
              <Route path="/bowlers/:id" element={<BowlerProfile />} />
              <Route path="/sessions" element={<Sessions />} />
              <Route path="/sessions/:id" element={<SessionView />} />
              <Route path="/upload" element={<UploadSession />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/vr" element={<VRPlaylists />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
