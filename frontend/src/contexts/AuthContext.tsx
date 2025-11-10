import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authAPI } from '../services/api'

interface User {
  id: string
  email: string
  role: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, role?: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      // Fetch current user
      authAPI
        .me()
        .then((res) => {
          setUser(res.data.user)
        })
        .catch(() => {
          // Invalid token
          localStorage.removeItem('token')
          setToken(null)
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [token])

  const login = async (email: string, password: string) => {
    const res = await authAPI.login(email, password)
    const { token, user } = res.data

    localStorage.setItem('token', token)
    setToken(token)
    setUser(user)
  }

  const register = async (email: string, password: string, role: string = 'coach') => {
    const res = await authAPI.register(email, password, role)
    const { token, user } = res.data

    localStorage.setItem('token', token)
    setToken(token)
    setUser(user)
  }

  const logout = () => {
    authAPI.logout().catch(() => {})
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
