// frontend/components/auth/signup-form.tsx
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
import { Loader2, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react"

interface SignupFormProps {
  onToggleMode: () => void
}

export function SignupForm({ onToggleMode }: SignupFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [verificationSent, setVerificationSent] = useState(false)
  const { signup, googleLogin, isLoading } = useAuth()

  const checkPasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++
    return strength
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value
    setPassword(newPassword)
    setPasswordStrength(checkPasswordStrength(newPassword))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (passwordStrength < 3) {
      setError("Password is too weak. Please use a stronger password.")
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address")
      return
    }

    console.log("🚀 Attempting signup with:", { 
      name, 
      email, 
      passwordLength: password.length,
      passwordStrength 
    })

    try {
      const result = await signup(email, password, name)
      console.log("📦 Signup result:", result)
      
      if (!result.success) {
        console.error("❌ Signup failed:", result.error)
        setError(result.error || "Failed to create account. Please try again.")
      } else {
        console.log("✅ Signup successful!")
        // Check if verification is required
        if (result.requiresVerification) {
          setVerificationSent(true)
        }
        // If no verification required, user will be redirected automatically by auth context
      }
    } catch (err) {
      console.error("💥 Unexpected error during signup:", err)
      setError("An unexpected error occurred. Please try again.")
    }
  }

  const getPasswordStrengthColor = () => {
    if (passwordStrength === 0) return "bg-gray-200"
    if (passwordStrength === 1) return "bg-red-500"
    if (passwordStrength === 2) return "bg-yellow-500"
    if (passwordStrength === 3) return "bg-green-500"
    return "bg-green-600"
  }

  const getPasswordStrengthText = () => {
    if (passwordStrength === 0) return "Very Weak"
    if (passwordStrength === 1) return "Weak"
    if (passwordStrength === 2) return "Medium"
    if (passwordStrength === 3) return "Strong"
    return "Very Strong"
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
            Start your journey
          </Badge>
          <span className="text-xs text-muted-foreground">Free plan available</span>
        </div>
        <div className="space-y-1 sm:space-y-2">
          <CardTitle className="text-xl sm:text-2xl font-bold text-center">Create your Finsync account</CardTitle>
          <CardDescription className="mx-auto max-w-md text-sm sm:text-base text-center px-2">
            Set up your profile, connect accounts, and unlock intelligent budgeting, investing, and trading tools.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
        {verificationSent ? (
          <div className="space-y-3 sm:space-y-4 rounded-lg border border-green-200 bg-green-50 p-4 sm:p-6 text-center dark:border-green-800 dark:bg-green-950">
            <div className="mx-auto flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-semibold text-green-900 dark:text-green-100">Check your email!</h3>
              <p className="text-xs sm:text-sm text-green-700 dark:text-green-300">
                We've sent a verification link to <strong className="break-all">{email}</strong>
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                Please check your inbox and click the verification link to activate your account.
              </p>
            </div>
            <div className="pt-2 sm:pt-4">
              <button
                type="button"
                onClick={onToggleMode}
                className="text-xs sm:text-sm font-semibold text-primary hover:underline"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        ) : (
          <>
            <CustomGoogleButton text="Sign up with Google" onGoogleSignIn={handleGoogleSignIn} />

        <div className="relative text-center">
          <Separator className="bg-border/60" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 sm:px-4 text-xs font-medium text-muted-foreground whitespace-nowrap">
            or create your account
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              className="h-10 sm:h-11"
            />
          </div>
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
                placeholder="Create a password (min. 8 characters)"
                value={password}
                onChange={handlePasswordChange}
                required
                autoComplete="new-password"
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
            {password && (
              <div className="mt-2 sm:mt-3 space-y-2 sm:space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Password strength:</span>
                  <span className="text-xs font-medium">{getPasswordStrengthText()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${getPasswordStrengthColor()}`}
                    style={{ width: `${(passwordStrength / 4) * 100}%` }}
                  />
                </div>
                <div className="grid gap-1.5 sm:gap-2 text-xs text-muted-foreground grid-cols-1 sm:grid-cols-2">
                  <div className="flex items-center">
                    {password.length >= 8 ? (
                      <CheckCircle className="h-3 w-3 text-green-500 mr-1 shrink-0" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-500 mr-1 shrink-0" />
                    )}
                    <span className="text-xs">At least 8 characters</span>
                  </div>
                  <div className="flex items-center">
                    {/[A-Z]/.test(password) ? (
                      <CheckCircle className="h-3 w-3 text-green-500 mr-1 shrink-0" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-500 mr-1 shrink-0" />
                    )}
                    <span className="text-xs">Uppercase letter</span>
                  </div>
                  <div className="flex items-center">
                    {/[0-9]/.test(password) ? (
                      <CheckCircle className="h-3 w-3 text-green-500 mr-1 shrink-0" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-500 mr-1 shrink-0" />
                    )}
                    <span className="text-xs">Number</span>
                  </div>
                  <div className="flex items-center">
                    {/[^A-Za-z0-9]/.test(password) ? (
                      <CheckCircle className="h-3 w-3 text-green-500 mr-1 shrink-0" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-500 mr-1 shrink-0" />
                    )}
                    <span className="text-xs">Special character</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="h-10 sm:h-11"
            />
          </div>
          {error && (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs sm:text-sm text-destructive">
              {error}
            </div>
          )}
          <Button type="submit" className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold shadow-sm" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>

        <div className="text-center text-xs sm:text-sm">
          Already have an account?{" "}
          <button type="button" onClick={onToggleMode} className="font-semibold text-primary hover:underline">
            Sign in
          </button>
        </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}