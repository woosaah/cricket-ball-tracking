import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor (add auth token)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor (handle errors)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  register: (email: string, password: string, role: string = 'coach') =>
    api.post('/auth/register', { email, password, role }),

  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  me: () => api.get('/auth/me'),

  logout: () => api.post('/auth/logout'),
}

// Bowlers API
export const bowlersAPI = {
  getAll: () => api.get('/bowlers'),

  getById: (id: string) => api.get(`/bowlers/${id}`),

  create: (data: any) => api.post('/bowlers', data),

  update: (id: string, data: any) => api.put(`/bowlers/${id}`, data),

  delete: (id: string) => api.delete(`/bowlers/${id}`),

  getStats: (id: string) => api.get(`/bowlers/${id}/stats`),
}

// Sessions API
export const sessionsAPI = {
  getAll: (params?: any) => api.get('/sessions', { params }),

  getById: (id: string) => api.get(`/sessions/${id}`),

  create: (formData: FormData) =>
    api.post('/sessions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  update: (id: string, data: any) => api.put(`/sessions/${id}`, data),

  delete: (id: string) => api.delete(`/sessions/${id}`),

  process: (id: string) => api.post(`/sessions/${id}/process`),

  getProgress: (id: string) => api.get(`/sessions/${id}/progress`),
}

// Deliveries API
export const deliveriesAPI = {
  getAll: (params?: any) => api.get('/deliveries', { params }),

  getById: (id: string) => api.get(`/deliveries/${id}`),

  getTrajectory: (id: string) => api.get(`/deliveries/${id}/trajectory`),

  getAction: (id: string) => api.get(`/deliveries/${id}/action`),

  update: (id: string, data: any) => api.put(`/deliveries/${id}`, data),
}

// VR API
export const vrAPI = {
  getBowlerDeliveries: (bowlerId: string, params?: any) =>
    api.get(`/vr/bowlers/${bowlerId}/deliveries`, { params }),

  getAllPlaylists: (params?: any) => api.get('/vr/playlists', { params }),

  getPlaylist: (id: string) => api.get(`/vr/playlists/${id}`),

  createPlaylist: (data: any) => api.post('/vr/playlists', data),

  updatePlaylist: (id: string, data: any) => api.put(`/vr/playlists/${id}`, data),

  deletePlaylist: (id: string) => api.delete(`/vr/playlists/${id}`),
}

export default api
