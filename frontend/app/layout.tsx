import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth-context"
import { TransactionsProvider } from "@/lib/transactions-context"
import { BudgetProvider } from "@/lib/budget-context"
import { UIProvider } from "@/lib/ui-context"
import { NotificationsProvider } from "@/lib/notifications-context"
import { GoalsProvider } from "@/lib/goals-context"
import { ErrorBoundary } from "@/components/error-boundary"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], preload: false })

export const metadata: Metadata = {
  title: "Finsync - Unified Finance Platform",
  description: "Track finances, analyze stocks, and simulate trading all in one place",
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/finsync-logo.svg', type: 'image/svg+xml' },
      { url: '/favicon.svg', type: 'image/svg+xml' }
    ],
    apple: '/finsync-logo.svg',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background antialiased", inter.className)}>
        <ErrorBoundary>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <UIProvider>
              <AuthProvider>
                <TransactionsProvider>
                  <BudgetProvider>
                    <NotificationsProvider>
                      <GoalsProvider>
                        <div className="flex min-h-screen flex-col bg-background">
                          {children}
                        </div>
                      </GoalsProvider>
                    </NotificationsProvider>
                  </BudgetProvider>
                </TransactionsProvider>
              </AuthProvider>
            </UIProvider>
          </ThemeProvider>
        </ErrorBoundary>
        <Toaster />
      </body>
    </html>
  )
}