import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const Layout = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link to="/" className="flex items-center space-x-2">
                <span className="text-2xl">🏏</span>
                <span className="text-xl font-bold text-primary-600">Cricket Coach AI</span>
              </Link>

              <nav className="hidden md:flex space-x-4">
                <Link to="/" className="px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100">
                  Dashboard
                </Link>
                <Link to="/bowlers" className="px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100">
                  Bowlers
                </Link>
                <Link to="/sessions" className="px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100">
                  Sessions
                </Link>
                <Link to="/analytics" className="px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100">
                  Analytics
                </Link>
                <Link to="/vr" className="px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100">
                  VR Training
                </Link>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <Link
                to="/upload"
                className="btn btn-primary"
              >
                Upload Session
              </Link>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">{user?.email}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
