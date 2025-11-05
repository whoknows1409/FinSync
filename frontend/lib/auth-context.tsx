// frontend/lib/auth-context.tsx
"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { toast } from "sonner"

interface User {
  id: string
  email: string
  name: string
  profileImage?: string
  phone?: string
  bio?: string
  membershipType?: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signup: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string; requiresVerification?: boolean }>
  googleLogin: (token: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  updateUser: (userData: Partial<User>) => Promise<void>
  isLoading: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check for stored user session
        const storedUser = localStorage.getItem("finsync-user")
        const token = localStorage.getItem("token")
        
        if (storedUser && token) {
          // Validate token with backend
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Cache-Control': 'no-cache'
            }
          })

          if (!response.ok) {
            throw new Error('Session expired')
          }

          setUser(JSON.parse(storedUser))
        }
      } catch (err) {
        console.error('Auth initialization error:', err)
        // Clear invalid session
        localStorage.removeItem("finsync-user")
        localStorage.removeItem("token")
        setError('Session expired. Please log in again.')
        toast.error('Session expired. Please log in again.')
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    setError(null)
    try {
      console.log("🔐 Sending login request to /api/auth/login")
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ email, password }),
      })

      console.log("📡 Login response status:", response.status)
      const data = await response.json()
      console.log("📦 Login response data:", data)

      if (!response.ok) {
        const errorMessage = data.message || "Invalid credentials. Please try again."
        setError(errorMessage)
        toast.error(errorMessage)
        return { success: false, error: errorMessage }
      }

      const { user, token } = data
      setUser(user)
      localStorage.setItem("finsync-user", JSON.stringify(user))
      localStorage.setItem("token", token)
      toast.success('Successfully logged in!')
      return { success: true }
    } catch (error) {
      console.error('💥 Login error:', error)
      const errorMessage = "An error occurred during login. Please try again."
      setError(errorMessage)
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string; requiresVerification?: boolean }> => {
    setIsLoading(true)
    setError(null)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const signupUrl = `${apiUrl}/auth/register`
      
      console.log("🚀 Attempting signup with:", { name, email, passwordLength: password.length, passwordStrength: password.length >= 8 ? 4 : 2 })
      console.log("🚀 Sending signup request to", signupUrl)
      
      const response = await fetch(signupUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ email, password, name }),
      })

      console.log("📡 Signup response status:", response.status)
      
      let data
      try {
        data = await response.json()
        console.log("📦 Signup result:", data)
      } catch (parseError) {
        console.error("❌ Failed to parse response as JSON:", parseError)
        const errorMessage = "Server returned invalid response. Please try again."
        setError(errorMessage)
        toast.error(errorMessage)
        return { success: false, error: errorMessage }
      }
      
      if (!response.ok) {
        const errorMessage = data.message || "Failed to create account. Please try again."
        console.log("❌ Signup failed:", errorMessage)
        setError(errorMessage)
        toast.error(errorMessage)
        return { success: false, error: errorMessage }
      }

      // Check if email verification is required
      if (data.requiresVerification) {
        console.log("✅ Registration successful, verification required")
        toast.success('Registration successful! Please check your email to verify your account.')
        return { success: true, requiresVerification: true }
      }

      // If no verification required, log user in
      const { user, token } = data
      setUser(user)
      localStorage.setItem("finsync-user", JSON.stringify(user))
      localStorage.setItem("token", token)
      toast.success('Account created successfully!')
      return { success: true }
    } catch (error) {
      console.error('💥 Signup error:', error)
      const errorMessage = "An error occurred during signup. Please try again."
      console.log("❌ Signup failed:", errorMessage)
      setError(errorMessage)
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }

  const googleLogin = async (credential: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    setError(null)
    try {
      console.log('🔐 Sending Google credential to backend for verification...')
      
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ credential }),
      })

      console.log('📡 Google auth response status:', response.status)
      
      // Handle rate limiting (429) separately
      if (response.status === 429) {
        const errorText = await response.text()
        let errorMessage = 'Too many login attempts. Please try again in 15 minutes.'
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.message || errorMessage
        } catch (e) {
          // If response is not JSON, use default message
          console.warn('Failed to parse 429 response:', errorText)
        }
        setError(errorMessage)
        toast.error(errorMessage)
        return { success: false, error: errorMessage }
      }
      
      const data = await response.json()
      console.log('📦 Google auth response data:', data)

      if (!response.ok) {
        const errorMessage = data.message || 'Google authentication failed'
        setError(errorMessage)
        toast.error(errorMessage)
        return { success: false, error: errorMessage }
      }

      const { user, token, refreshToken } = data
      setUser(user)
      localStorage.setItem("finsync-user", JSON.stringify(user))
      localStorage.setItem("token", token)
      if (refreshToken) {
        localStorage.setItem("refreshToken", refreshToken)
      }
      
      console.log('✅ Google authentication successful')
      toast.success('Successfully logged in with Google!')
      return { success: true }
    } catch (err) {
      console.error('❌ Google login error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Google login failed'
      setError(errorMessage)
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }

  const updateUser = async (userData: Partial<User>): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      console.log("🔄 Sending update user request to /api/v1/profile")
      
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No authentication token found")
      }
      
      const response = await fetch('/api/v1/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify(userData),
      })

      console.log("📡 Update user response status:", response.status)
      const data = await response.json()
      console.log("📦 Update user response data:", data)

      if (!response.ok) {
        throw new Error(data.message || "Failed to update profile. Please try again.")
      }

      const updatedUser = data.data
      const userToStore = {
        ...updatedUser,
        id: updatedUser.id || updatedUser._id
      }
      
      setUser(userToStore)
      localStorage.setItem("finsync-user", JSON.stringify(userToStore))
      toast.success('Profile updated successfully!')
    } catch (error) {
      console.error('💥 Update user error:', error)
      const errorMessage = error instanceof Error ? error.message : "Failed to update profile"
      setError(errorMessage)
      toast.error(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    setError(null)
    localStorage.removeItem("finsync-user")
    localStorage.removeItem("token")
    toast.success('Logged out successfully')
  }

  return (
    <AuthContext.Provider value={{ user, login, signup, googleLogin, logout, updateUser, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}