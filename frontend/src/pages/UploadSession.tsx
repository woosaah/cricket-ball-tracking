import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { bowlersAPI, sessionsAPI } from '../services/api'

const UploadSession = () => {
  const navigate = useNavigate()
  const [bowlers, setBowlers] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    bowler_id: '',
    session_date: new Date().toISOString().split('T')[0],
    location: '',
    notes: '',
  })
  const [videoFile, setVideoFile] = useState<File | null>(null)

  useEffect(() => {
    fetchBowlers()
  }, [])

  const fetchBowlers = async () => {
    try {
      const res = await bowlersAPI.getAll()
      setBowlers(res.data.bowlers)
    } catch (error) {
      console.error('Failed to fetch bowlers:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!videoFile || !formData.bowler_id) {
      alert('Please select a bowler and video file')
      return
    }

    setUploading(true)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('bowler_id', formData.bowler_id)
      formDataToSend.append('session_date', formData.session_date)
      formDataToSend.append('location', formData.location)
      formDataToSend.append('notes', formData.notes)
      formDataToSend.append('video', videoFile)

      const res = await sessionsAPI.create(formDataToSend)
      const sessionId = res.data.session.id

      // Trigger processing
      await sessionsAPI.process(sessionId)

      alert('Session uploaded successfully! Processing started.')
      navigate(`/sessions/${sessionId}`)
    } catch (error: any) {
      console.error('Failed to upload session:', error)
      alert(error.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1>Upload Session</h1>
        <p className="text-gray-600 mt-2">
          Upload a training session video for analysis
        </p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="label">Bowler *</label>
            <select
              value={formData.bowler_id}
              onChange={(e) => setFormData({ ...formData, bowler_id: e.target.value })}
              className="input w-full"
              required
            >
              <option value="">Select a bowler</option>
              {bowlers.map((bowler) => (
                <option key={bowler.id} value={bowler.id}>
                  {bowler.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Session Date *</label>
            <input
              type="date"
              value={formData.session_date}
              onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
              className="input w-full"
              required
            />
          </div>

          <div>
            <label className="label">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="input w-full"
              placeholder="e.g., Home nets, Academy"
            />
          </div>

          <div>
            <label className="label">Video File *</label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              className="input w-full"
              required
            />
            {videoFile && (
              <p className="text-sm text-gray-600 mt-2">
                Selected: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input w-full"
              rows={4}
              placeholder="Optional notes about this session..."
            />
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="btn btn-primary w-full"
          >
            {uploading ? 'Uploading...' : 'Upload & Process Session'}
          </button>

          {uploading && (
            <div className="text-center text-gray-600">
              <div className="spinner mx-auto mb-2"></div>
              <p>Uploading video and starting AI analysis...</p>
            </div>
          )}
        </form>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">📹 Recording Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Position camera 7m perpendicular to pitch center</li>
          <li>• Keep camera at ~1.8m height (eye level)</li>
          <li>• Ensure both sets of stumps are visible</li>
          <li>• Record at 30fps minimum (60fps preferred)</li>
          <li>• Keep camera still - no panning</li>
          <li>• Use landscape orientation</li>
        </ul>
      </div>
    </div>
  )
}

export default UploadSession
