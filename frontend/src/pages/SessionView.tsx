import { useParams, Link } from 'react-router-dom'

const SessionView = () => {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="space-y-8">
      <div>
        <Link to="/sessions" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
          ← Back to Sessions
        </Link>
        <h1>Session Details</h1>
      </div>

      <div className="card">
        <p className="text-gray-600">
          Full session view with video player, deliveries list, and insights coming soon...
        </p>
        <p className="text-sm text-gray-500 mt-2">Session ID: {id}</p>
      </div>
    </div>
  )
}

export default SessionView
