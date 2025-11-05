// frontend/components/auth/login-form.tsx
"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CustomGoogleButton } from "@/components/auth/custom-google-button"
import { useAuth } from "@/lib/auth-context"
import { Loader2, Eye, EyeOff } from "lucide-react"

interface LoginFormProps {
  onToggleMode: () => void
}

export function LoginForm({ onToggleMode }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showResendVerification, setShowResendVerification] = useState(false)
  const [resending, setResending] = useState(false)
  const { login, googleLogin, isLoading } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setShowResendVerification(false)

    // Basic validation
    if (!email || !password) {
      setError("Please fill in all fields")
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address")
      return
    }

    const result = await login(email, password)
    if (!result.success) {
      setError(result.error || "Invalid credentials. Please try again.")
      // Check if error is related to email verification
      if (result.error?.toLowerCase().includes('verify')) {
        setShowResendVerification(true)
      }
    }
  }

  const handleResendVerification = async () => {
    if (!email) {
      setError("Please enter your email address")
      return
    }

    setResending(true)
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setError("")
        alert('Verification email sent! Please check your inbox.')
      } else {
        setError(data.message || 'Failed to resend verification email')
      }
    } catch (err) {
      console.error('Resend error:', err)
      setError('Failed to resend verification email. Please try again.')
    } finally {
      setResending(false)
    }
  }

  const handleGoogleSignIn = async (credential: string) => {
    const result = await googleLogin(credential)
    if (!result.success) {
      setError(result.error || "Google authentication failed. Please try again.")
    }
  }

  return (
    <Card className="w-full border-0 shadow-none bg-transparent">
      <CardHeader className="space-y-2 sm:space-y-3 px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary text-xs">
            Welcome back
          </Badge>
          <span className="text-xs text-muted-foreground">Secure access</span>
        </div>
        <div className="space-y-1 sm:space-y-2">
          <CardTitle className="text-xl sm:text-2xl font-bold text-center">Sign in to Finsync</CardTitle>
          <CardDescription className="mx-auto max-w-sm text-sm sm:text-base text-center px-2">
            Continue where you left off and stay on top of your finances with personalized dashboards.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
        <CustomGoogleButton text="Continue with Google" onGoogleSignIn={handleGoogleSignIn} />

        <div className="relative text-center">
          <Separator className="bg-border/60" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 sm:px-4 text-xs font-medium text-muted-foreground whitespace-nowrap">
            or sign in with email
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="h-10 sm:h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                minLength={8}
                className="h-10 sm:h-11 pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          {error && (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs sm:text-sm text-destructive">
              {error}
              {showResendVerification && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resending}
                    className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
                  >
                    {resending ? 'Sending...' : 'Resend verification email'}
                  </button>
                </div>
              )}
            </div>
          )}
          <Button type="submit" className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold shadow-sm" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>
        <div className="rounded-lg bg-muted/40 p-3 sm:p-4 text-left text-xs sm:text-sm leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">Why teams choose Finsync</p>
          <ul className="mt-2 space-y-1">
            <li>• Real-time portfolio insights</li>
            <li>• Budget tracking with smart alerts</li>
            <li>• Secure AI-powered recommendations</li>
          </ul>
        </div>

        <div className="text-center text-xs sm:text-sm">
          Don&apos;t have an account?{" "}
          <button type="button" onClick={onToggleMode} className="font-semibold text-primary hover:underline">
            Sign up free
          </button>
        </div>
      </CardContent>
    </Card>
  )
}