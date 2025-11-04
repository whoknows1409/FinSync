// app/providers.tsx
'use client'

import { useEffect, useState } from 'react'
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth-context"
import { TransactionsProvider } from "@/lib/transactions-context"
import { BudgetProvider } from "@/lib/budget-context"
import { UIProvider } from "@/lib/ui-context"
import { NotificationsProvider } from "@/lib/notifications-context"
import { GoalsProvider } from "@/lib/goals-context"
import { ErrorBoundary } from "@/components/error-boundary"
import { Toaster } from "@/components/ui/sonner"

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const [googleScriptLoaded, setGoogleScriptLoaded] = useState(false)

  useEffect(() => {
    // Check if Google script is already loaded
    if (window.google?.accounts?.id) {
      setGoogleScriptLoaded(true)
      return
    }

    // Load Google Sign-In script
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    
    script.onload = () => {
      console.log('Google Sign-In script loaded successfully')
      setGoogleScriptLoaded(true)
    }
    
    script.onerror = () => {
      console.error('Failed to load Google Sign-In script')
    }
    
    document.head.appendChild(script)

    return () => {
      // Cleanup script when component unmounts
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  return (
    <ErrorBoundary>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <UIProvider>
          <AuthProvider>
            <TransactionsProvider>
              <BudgetProvider>
                <NotificationsProvider>
                  <GoalsProvider>
                    {children}
                  </GoalsProvider>
                </NotificationsProvider>
              </BudgetProvider>
            </TransactionsProvider>
          </AuthProvider>
        </UIProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}