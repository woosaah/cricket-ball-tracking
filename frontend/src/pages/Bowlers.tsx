import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { bowlersAPI } from '../services/api'

const Bowlers = () => {
  const [bowlers, setBowlers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    bowling_style: 'fast',
    bowling_arm: 'right',
    height_cm: '',
    weight_kg: '',
  })

  useEffect(() => {
    fetchBowlers()
  }, [])

  const fetchBowlers = async () => {
    try {
      const res = await bowlersAPI.getAll()
      setBowlers(res.data.bowlers)
    } catch (error) {
      console.error('Failed to fetch bowlers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await bowlersAPI.create({
        ...formData,
        age: formData.age ? parseInt(formData.age) : null,
        height_cm: formData.height_cm ? parseInt(formData.height_cm) : null,
        weight_kg: formData.weight_kg ? parseInt(formData.weight_kg) : null,
      })

      setShowForm(false)
      setFormData({
        name: '',
        age: '',
        bowling_style: 'fast',
        bowling_arm: 'right',
        height_cm: '',
        weight_kg: '',
      })
      fetchBowlers()
    } catch (error) {
      console.error('Failed to create bowler:', error)
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
        <h1>Bowlers</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? 'Cancel' : '+ Add Bowler'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="mb-6">Add New Bowler</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input w-full"
                  required
                />
              </div>

              <div>
                <label className="label">Age</label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="label">Bowling Style</label>
                <select
                  value={formData.bowling_style}
                  onChange={(e) => setFormData({ ...formData, bowling_style: e.target.value })}
                  className="input w-full"
                >
                  <option value="fast">Fast</option>
                  <option value="medium">Medium</option>
                  <option value="spin">Spin</option>
                </select>
              </div>

              <div>
                <label className="label">Bowling Arm</label>
                <select
                  value={formData.bowling_arm}
                  onChange={(e) => setFormData({ ...formData, bowling_arm: e.target.value })}
                  className="input w-full"
                >
                  <option value="right">Right</option>
                  <option value="left">Left</option>
                </select>
              </div>

              <div>
                <label className="label">Height (cm)</label>
                <input
                  type="number"
                  value={formData.height_cm}
                  onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="label">Weight (kg)</label>
                <input
                  type="number"
                  value={formData.weight_kg}
                  onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                  className="input w-full"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary">
              Create Bowler
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bowlers.map((bowler) => (
          <Link
            key={bowler.id}
            to={`/bowlers/${bowler.id}`}
            className="card hover:shadow-lg transition-shadow"
          >
            <h3 className="text-xl font-semibold mb-4">{bowler.name}</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                <span className="font-medium">Style:</span> {bowler.bowling_style || 'N/A'}
              </p>
              <p>
                <span className="font-medium">Arm:</span> {bowler.bowling_arm || 'N/A'}
              </p>
              <p>
                <span className="font-medium">Sessions:</span> {bowler.total_sessions || 0}
              </p>
              <p>
                <span className="font-medium">Deliveries:</span> {bowler.total_deliveries || 0}
              </p>
              {bowler.avg_speed && (
                <p className="text-primary-600 font-medium">
                  Avg Speed: {bowler.avg_speed.toFixed(1)} km/h
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {bowlers.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-gray-600 mb-4">No bowlers yet</p>
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            Add Your First Bowler
          </button>
        </div>
      )}
    </div>
  )
}

export default Bowlers
