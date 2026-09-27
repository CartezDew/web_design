import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { apiRequest } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiRequest('/auth/session/')
      .then((data) => setUser(data.user))
      .finally(() => setLoading(false))
  }, [])

  const value = useMemo(() => ({
    user,
    loading,
    async signIn(email, password) {
      const data = await apiRequest('/auth/session/', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      setUser(data.user)
      return data.user
    },
    async signOut() {
      await apiRequest('/auth/session/', { method: 'DELETE' })
      setUser(null)
    },
    setUser,
  }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
