// components/auth/custom-google-button.tsx
"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle } from "lucide-react"

interface CustomGoogleButtonProps {
  onGoogleSignIn: (credential: string) => void
  text: string
}

export function CustomGoogleButton({ onGoogleSignIn, text }: CustomGoogleButtonProps) {
  const [loading, setLoading] = useState(false)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fedcmDisabled, setFedcmDisabled] = useState(false)

  useEffect(() => {
    // Check if Google script is already loaded
    if (window.google?.accounts?.id) {
      setScriptLoaded(true)
      return
    }

    // Load Google Identity Services library
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      console.log('Google script loaded successfully')
      setScriptLoaded(true)
    }
    script.onerror = () => {
      console.error('Failed to load Google script')
      setError('Failed to load Google authentication script')
    }
    document.head.appendChild(script)

    return () => {
      // Cleanup
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  const handleGoogleSignIn = async () => {
    if (!scriptLoaded) {
      console.error('Google script not loaded yet')
      setError('Google authentication is not ready yet. Please try again in a moment.')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
      const currentOrigin = window.location.origin
      
      console.log('Initializing Google Sign-In with:', { clientId, currentOrigin })
      
      if (!clientId) {
        console.error('Google Client ID is missing')
        setError('Google authentication is not properly configured')
        setLoading(false)
        return
      }

      // Initialize Google Sign-In with FedCM support
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: any) => {
          console.log('Google Sign-In response:', response)
          if (response.credential) {
            onGoogleSignIn(response.credential)
          } else {
            console.error('No credential in response')
            setError('Authentication failed: No credential received')
          }
          setLoading(false)
        },
        auto_select: false,
        cancel_on_tap_outside: false,
        // Enable FedCM support
        use_fedcm_for_prompt: true
      } as any)

      // Try to prompt the user to sign in
      window.google.accounts.id.prompt((notification: any) => {
        console.log('Google Sign-In prompt notification:', notification)
        
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          console.log('Google Sign-In was not displayed or was skipped')
          setFedcmDisabled(true)
          setError('Google Sign-In was not available. Try again or use email to continue.')
          setLoading(false)
        }
        
        if (notification.isDismissedMoment()) {
          console.log('Google Sign-In was dismissed by the user')
          setLoading(false)
        }
      })
    } catch (error) {
      console.error('Error during Google Sign-In:', error)
      setError('An error occurred during Google Sign-In. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <Button 
        variant="outline" 
        className="w-full" 
        onClick={handleGoogleSignIn}
        disabled={loading || !scriptLoaded}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : !scriptLoaded ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Initializing...
          </>
        ) : (
          <div className="flex items-center justify-center w-full">
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {text}
          </div>
        )}
      </Button>
      
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <div className="flex items-start space-x-2">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}