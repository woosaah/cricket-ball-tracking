import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { bowlersAPI } from '../services/api'

const BowlerProfile = () => {
  const { id } = useParams<{ id: string }>()
  const [bowler, setBowler] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchBowlerData()
    }
  }, [id])

  const fetchBowlerData = async () => {
    try {
      const [bowlerRes, statsRes] = await Promise.all([
        bowlersAPI.getById(id!),
        bowlersAPI.getStats(id!),
      ])

      setBowler(bowlerRes.data.bowler)
      setStats(statsRes.data)
    } catch (error) {
      console.error('Failed to fetch bowler data:', error)
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

  if (!bowler) {
    return <div className="text-center py-12">Bowler not found</div>
  }

  return (
    <div className="space-y-8">
      <div>
        <Link to="/bowlers" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
          ← Back to Bowlers
        </Link>
        <h1>{bowler.name}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <p className="text-sm text-gray-600">Total Sessions</p>
          <p className="text-3xl font-bold text-primary-600">{stats.stats.total_sessions || 0}</p>
        </div>

        <div className="card">
          <p className="text-sm text-gray-600">Total Deliveries</p>
          <p className="text-3xl font-bold text-primary-600">{stats.stats.total_deliveries || 0}</p>
        </div>

        <div className="card">
          <p className="text-sm text-gray-600">Average Speed</p>
          <p className="text-3xl font-bold text-primary-600">
            {stats.stats.avg_speed ? `${stats.stats.avg_speed.toFixed(1)} km/h` : 'N/A'}
          </p>
        </div>
      </div>

      {/* TODO: Add charts, heatmaps, recent sessions, insights */}
      <div className="card">
        <h2>Recent Sessions</h2>
        <p className="text-gray-600 mt-4">Session history coming soon...</p>
      </div>
    </div>
  )
}

export default BowlerProfile
