"use client"

import { useEffect, useRef } from 'react'

/**
 * BackendWakeup Component
 * 
 * Automatically wakes up the backend service when the frontend loads.
 * This is necessary for free-tier hosting services like Render that
 * spin down services after ~15 minutes of inactivity.
 * 
 * The component:
 * 1. Pings the backend health endpoint DIRECTLY (bypassing the Next.js proxy)
 *    so the wake-up request reaches the backend even while the frontend is
 *    still hydrating or the proxy chain is slow.
 * 2. Retries up to 8 times with 5s delays (covers ~160s of cold-start time).
 * 3. Falls back to the proxy path (/api/health) if no direct URL is configured.
 * 4. Runs silently in the background without blocking the UI.
 */

// Resolve the backend URL: env var → hardcoded Render URL → proxy fallback
const BACKEND_DIRECT_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'https://finsync-backend-fwlz.onrender.com'

export function BackendWakeup() {
  const hasWokenUp = useRef(false)

  useEffect(() => {
    // Only run once per session
    if (hasWokenUp.current) return
    hasWokenUp.current = true

    const wakeUpBackend = async () => {
      // Ping the backend directly to avoid going through the Next.js rewrite
      // proxy, which itself may be cold-starting on Render.
      const directHealthUrl = `${BACKEND_DIRECT_URL}/api/health`
      // Keep the proxy path as a secondary ping target
      const proxyHealthUrl = '/api/health'

      let attempts = 0
      const maxAttempts = 8
      const retryDelay = 5000  // 5 seconds between retries
      const requestTimeout = 15000  // 15 second timeout per request

      const tryWakeUp = async (): Promise<void> => {
        attempts++

        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), requestTimeout)

          // Try the direct URL first; on the last few attempts also fire
          // a proxy ping in parallel as a fallback.
          const directPing = fetch(directHealthUrl, {
            method: 'GET',
            signal: controller.signal,
            cache: 'no-store',
            mode: 'cors',
            headers: { 'Cache-Control': 'no-cache' }
          })

          // After the 4th attempt, also try the proxy path in parallel
          // in case the direct URL has issues (e.g., env misconfiguration)
          let proxyPing: Promise<Response> | null = null
          if (attempts > 4) {
            proxyPing = fetch(proxyHealthUrl, {
              method: 'GET',
              cache: 'no-store',
              headers: { 'Cache-Control': 'no-cache' }
            }).catch(() => null as any)
          }

          const response = await Promise.any(
            [directPing, proxyPing].filter(Boolean) as Promise<Response>[]
          ).catch(() => null)

          clearTimeout(timeoutId)

          if (response?.ok) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`✅ Backend is awake and ready (attempt ${attempts})`)
            }
            return
          }

          throw new Error(
            response
              ? `Backend responded with status: ${response.status}`
              : 'All ping attempts failed'
          )
        } catch (error) {
          if (attempts < maxAttempts) {
            if (process.env.NODE_ENV === 'development') {
              console.log(
                `⏳ Backend is waking up... (attempt ${attempts}/${maxAttempts})`
              )
            }
            await new Promise(resolve => setTimeout(resolve, retryDelay))
            return tryWakeUp()
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.warn(
                '⚠️ Backend may still be waking up. It will be available shortly.'
              )
            }
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
