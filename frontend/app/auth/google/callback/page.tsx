// app/auth/google/callback/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

export default function GoogleCallbackPage() {
  const router = useRouter()
  const { googleLogin } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [details, setDetails] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [rawResponse, setRawResponse] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the authorization code from the URL
        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get('code')
        const errorParam = urlParams.get('error')
        const scope = urlParams.get('scope')
        const authuser = urlParams.get('authuser')
        const prompt = urlParams.get('prompt')

        // Debug information
        setDebugInfo({
          code: code ? `${code.substring(0, 10)}...` : null,
          error: errorParam,
          scope,
          authuser,
          prompt,
          currentUrl: window.location.href,
          origin: window.location.origin
        })

        if (errorParam) {
          setError(`Authentication error: ${errorParam}`)
          setLoading(false)
          return
        }

        if (!code) {
          setError('No authorization code received')
          setLoading(false)
          return
        }

        console.log('Received Google authorization code, exchanging for token...')
        console.log('Debug info:', debugInfo)

        // Send the code to your backend to exchange for tokens
        const response = await fetch('/api/auth/google/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        })

        // Check if response is OK
        if (!response.ok) {
          const errorText = await response.text()
          setRawResponse(errorText)
          
          // Try to parse as JSON if possible
          try {
            const errorData = JSON.parse(errorText)
            const errorMessage = errorData.message || 'Authentication failed'
            const errorDetails = errorData.details || ''
            setError(errorMessage)
            setDetails(errorDetails)
          } catch (parseError) {
            // If it's not JSON, it's likely an HTML error page
            setError('Server returned an error response. Please check the server logs.')
            setDetails(`Status: ${response.status}, Response: ${errorText.substring(0, 200)}...`)
          }
          
          setLoading(false)
          return
        }

        const data = await response.json()
        console.log('Received authentication data from backend:', data)

        // Use the googleLogin method to update the auth state
        const result = await googleLogin(data.token)
        
        if (!result.success) {
          setError(result.error || 'Failed to authenticate with Google')
          setLoading(false)
          return
        }

        console.log('Authentication successful, redirecting to dashboard...')
        // Redirect to dashboard
        router.push('/dashboard')
      } catch (err) {
        console.error('Error handling Google callback:', err)
        setError('An unexpected error occurred during authentication')
        setDetails(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      }
    }

    handleCallback()
  }, [googleLogin, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Authenticating with Google...</p>
          <p className="text-sm text-muted-foreground mt-2">This may take a few moments</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full">
          <h1 className="text-2xl font-bold text-destructive mb-4">Authentication Error</h1>
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-800 font-medium">{error}</p>
            {details && (
              <details className="mt-2">
                <summary className="text-sm text-red-700 cursor-pointer">View technical details</summary>
                <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto text-left">
                  {details}
                </pre>
              </details>
            )}
            {rawResponse && (
              <details className="mt-2">
                <summary className="text-sm text-red-700 cursor-pointer">View server response</summary>
                <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto text-left max-h-40">
                  {rawResponse}
                </pre>
              </details>
            )}
            {debugInfo && (
              <details className="mt-2">
                <summary className="text-sm text-red-700 cursor-pointer">View debug information</summary>
                <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto text-left">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </details>
            )}
          </div>
          
          <div className="space-y-3">
            <button 
              onClick={() => router.push('/')}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Back to Home
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 border border-border rounded-md hover:bg-accent"
            >
              Try Again
            </button>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="font-medium text-blue-800 mb-2">Troubleshooting Steps</h3>
            <ul className="text-sm text-blue-700 space-y-1 text-left">
              <li>• Make sure your Google Cloud Console has the correct redirect URI: <code className="bg-blue-100 px-1 rounded">http://localhost:3000/auth/google/callback</code></li>
              <li>• Verify your Google Client ID and Client Secret are correct in environment variables</li>
              <li>• Check that your OAuth consent screen is configured properly</li>
              <li>• Make sure the backend server is running and accessible</li>
              <li>• Try clearing browser cookies and cache</li>
              <li>• Check the backend server logs for detailed error messages</li>
              <li>• Make sure you're using the correct Google account for testing</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return null
}