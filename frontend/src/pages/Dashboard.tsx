import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { bowlersAPI, sessionsAPI } from '../services/api'

interface Bowler {
  id: string
  name: string
  total_sessions: number
  total_deliveries: number
  avg_speed: number
}

interface Session {
  id: string
  bowler_name: string
  session_date: string
  processed: boolean
  processing_status: string
}

const Dashboard = () => {
  const [bowlers, setBowlers] = useState<Bowler[]>([])
  const [recentSessions, setRecentSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bowlersRes, sessionsRes] = await Promise.all([
          bowlersAPI.getAll(),
          sessionsAPI.getAll({ limit: 5 }),
        ])

        setBowlers(bowlersRes.data.bowlers)
        setRecentSessions(sessionsRes.data.sessions)
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome to Cricket Coaching AI - Your intelligent bowling analysis platform
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Bowlers</p>
              <p className="text-3xl font-bold text-primary-600">{bowlers.length}</p>
            </div>
            <div className="text-4xl">👤</div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Sessions</p>
              <p className="text-3xl font-bold text-primary-600">
                {bowlers.reduce((sum, b) => sum + (b.total_sessions || 0), 0)}
              </p>
            </div>
            <div className="text-4xl">📹</div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Deliveries</p>
              <p className="text-3xl font-bold text-primary-600">
                {bowlers.reduce((sum, b) => sum + (b.total_deliveries || 0), 0)}
              </p>
            </div>
            <div className="text-4xl">🎾</div>
          </div>
        </div>
      </div>

      {/* Bowlers */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Your Bowlers</h2>
          <Link to="/bowlers" className="text-primary-600 hover:text-primary-700 font-medium">
            View All →
          </Link>
        </div>

        {bowlers.length === 0 ? (
          <p className="text-gray-600 text-center py-8">
            No bowlers yet. Add your first bowler to get started!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bowlers.slice(0, 6).map((bowler) => (
              <Link
                key={bowler.id}
                to={`/bowlers/${bowler.id}`}
                className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:shadow-md transition-all"
              >
                <h3 className="font-semibold text-lg mb-2">{bowler.name}</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>Sessions: {bowler.total_sessions || 0}</p>
                  <p>Deliveries: {bowler.total_deliveries || 0}</p>
                  {bowler.avg_speed && (
                    <p className="text-primary-600 font-medium">
                      Avg Speed: {bowler.avg_speed.toFixed(1)} km/h
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Sessions */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Recent Sessions</h2>
          <Link to="/sessions" className="text-primary-600 hover:text-primary-700 font-medium">
            View All →
          </Link>
        </div>

        {recentSessions.length === 0 ? (
          <p className="text-gray-600 text-center py-8">
            No sessions yet. Upload your first session to get started!
          </p>
        ) : (
          <div className="space-y-3">
            {recentSessions.map((session) => (
              <Link
                key={session.id}
                to={`/sessions/${session.id}`}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:shadow-md transition-all"
              >
                <div>
                  <h3 className="font-semibold">{session.bowler_name}</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(session.session_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  {session.processed ? (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                      Processed
                    </span>
                  ) : session.processing_status === 'processing' ? (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                      Processing...
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                      Pending
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
