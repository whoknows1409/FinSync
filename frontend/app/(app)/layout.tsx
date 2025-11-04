// app/(app)/layout.tsx
"use client"

import { useAuth } from "@/lib/auth-context"
import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/")
    }
  }, [user, router])

  if (!user) {
    return null // Will redirect to home
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <div className="flex flex-1 flex-col md:flex-row pt-16">
        <SidebarWrapper />
        <MainContentWrapper>
          {children}
        </MainContentWrapper>
      </div>
    </div>
  )
}

// Client component for sidebar with collapse functionality
function SidebarWrapper() {
  return (
    <aside className={cn(
      "hidden border-border bg-muted/10 transition-all duration-300 md:fixed md:left-0 md:top-16 md:flex md:h-[calc(100vh-4rem)] md:flex-shrink-0 md:w-64",
      "sidebar-transition" // Add this class for consistent transitions
    )}>
      <Sidebar />
    </aside>
  )
}

// Client component for main content area
function MainContentWrapper({ children }: { children: React.ReactNode }) {
  return (
    <main
      className={cn(
        "flex-1 transition-all duration-300 md:ml-64",
        "content-transition" // Add this class for consistent transitions
      )}
    >
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:max-w-7xl lg:px-8 lg:py-10">
        {children}
      </div>
    </main>
  )
}