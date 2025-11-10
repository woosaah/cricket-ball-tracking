import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { sessionsAPI } from '../services/api'

const Sessions = () => {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const res = await sessionsAPI.getAll()
      setSessions(res.data.sessions)
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1>Sessions</h1>
        <Link to="/upload" className="btn btn-primary">
          + Upload Session
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-600 mb-4">No sessions yet</p>
          <Link to="/upload" className="btn btn-primary">
            Upload Your First Session
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <Link
              key={session.id}
              to={`/sessions/${session.id}`}
              className="card hover:shadow-lg transition-shadow flex justify-between items-center"
            >
              <div>
                <h3 className="text-xl font-semibold">{session.bowler_name}</h3>
                <p className="text-gray-600 mt-1">
                  {new Date(session.session_date).toLocaleDateString('en-NZ', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                {session.location && (
                  <p className="text-sm text-gray-500 mt-1">📍 {session.location}</p>
                )}
              </div>

              <div className="text-right">
                {session.processed ? (
                  <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    ✓ Processed
                  </span>
                ) : session.processing_status === 'processing' ? (
                  <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    ⏳ Processing...
                  </span>
                ) : session.processing_status === 'failed' ? (
                  <span className="px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                    ✗ Failed
                  </span>
                ) : (
                  <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                    Pending
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default Sessions
