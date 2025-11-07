"use client"

import { useEffect, useRef } from 'react'

/**
 * BackendWakeup Component
 * 
 * Automatically wakes up the backend service when the frontend loads.
 * This is useful for free-tier hosting services like Render that put
 * services to sleep after inactivity.
 * 
 * The component:
 * 1. Pings the backend health endpoint as soon as the frontend loads
 * 2. Retries a few times if the backend is still waking up
 * 3. Runs silently in the background without blocking the UI
 */
export function BackendWakeup() {
  const hasWokenUp = useRef(false)

  useEffect(() => {
    // Only run once per session
    if (hasWokenUp.current) return
    hasWokenUp.current = true

    const wakeUpBackend = async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const healthEndpoint = `${apiUrl}/api/health`
      
      let attempts = 0
      const maxAttempts = 3
      const retryDelay = 2000 // 2 seconds

      const tryWakeUp = async (): Promise<void> => {
        attempts++
        
        try {
          // Set a timeout for the request (10 seconds)
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 10000)

          const response = await fetch(healthEndpoint, {
            method: 'GET',
            signal: controller.signal,
            // Don't cache this request
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
            }
          })

          clearTimeout(timeoutId)

          if (response.ok) {
            console.log('✅ Backend is awake and ready')
            return
          }
          
          throw new Error(`Backend responded with status: ${response.status}`)
        } catch (error) {
          if (attempts < maxAttempts) {
            console.log(`⏳ Backend is waking up... (attempt ${attempts}/${maxAttempts})`)
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, retryDelay))
            return tryWakeUp()
          } else {
            console.warn('⚠️ Backend may still be waking up. It will be available shortly.')
          }
        }
      }

      // Start the wake-up process
      await tryWakeUp()
    }

    // Wake up backend immediately when component mounts
    wakeUpBackend()
  }, [])

  // This component doesn't render anything
  return null
}
