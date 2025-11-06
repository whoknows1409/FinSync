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
      setScriptLoaded(true)
    }
    script.onerror = () => {
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
      setError('Google authentication is not ready yet. Please try again in a moment.')
      return
    }

    try {
      setLoading(true)
      setError(null)
      setFedcmDisabled(false)
      
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
      
      if (!clientId) {
        setError('Google authentication is not properly configured')
        setLoading(false)
        return
      }

      // Skip One-Tap entirely and go straight to OAuth2 popup
      // This avoids FedCM warnings and COOP errors
      try {
        const googleAccounts = window.google.accounts as any;
        if (!googleAccounts.oauth2) {
          throw new Error('OAuth2 not available');
        }
        
        // Suppress console errors from Google's library
        const originalError = console.error;
        const suppressedPatterns = [
          'Cross-Origin-Opener-Policy',
          'FedCM',
          'GSI_LOGGER'
        ];
        
        console.error = (...args: any[]) => {
          const message = args.join(' ');
          if (!suppressedPatterns.some(pattern => message.includes(pattern))) {
            originalError.apply(console, args);
          }
        };
        
        const client = googleAccounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'email profile openid',
          callback: async (tokenResponse: any) => {
            // Restore console.error
            console.error = originalError;
            
            if (tokenResponse.error) {
              setError('Google Sign-In was cancelled or failed. Please try again.')
              setLoading(false)
              return
            }
            
            if (tokenResponse.access_token) {
              try {
                // Exchange token for user info
                const userInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo`, {
                  headers: {
                    Authorization: `Bearer ${tokenResponse.access_token}`
                  }
                })
                
                if (!userInfoResponse.ok) {
                  throw new Error('Failed to fetch user info')
                }
                
                const userInfo = await userInfoResponse.json()
                
                // Create a credential-like object for backward compatibility
                const mockCredential = btoa(JSON.stringify({
                  email: userInfo.email,
                  name: userInfo.name,
                  picture: userInfo.picture,
                  sub: userInfo.sub
                }))
                
                onGoogleSignIn(mockCredential)
                setLoading(false)
              } catch (err) {
                console.error = originalError;
                setError('Failed to retrieve user information')
                setLoading(false)
              }
            } else {
              setError('Authentication failed: No token received')
              setLoading(false)
            }
          },
          error_callback: (error: any) => {
            // Restore console.error
            console.error = originalError;
            
            // Don't show error if user just closed the popup
            if (error.type !== 'popup_closed') {
              setError('Google Sign-In failed. Please try again.')
            }
            setLoading(false)
          }
        })
        
        // Request access token - this opens the popup
        client.requestAccessToken({ prompt: 'consent' })
        
        // Restore console.error after a delay (in case of async errors)
        setTimeout(() => {
          console.error = originalError;
        }, 2000)
        
      } catch (fallbackError) {
        setFedcmDisabled(true)
        setError('Google Sign-In is not available in this browser. Please use email to continue.')
        setLoading(false)
      }
    } catch (error) {
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
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}