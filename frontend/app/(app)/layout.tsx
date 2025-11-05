// app/(app)/layout.tsx
"use client"

import { useAuth } from "@/lib/auth-context"
import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useUI } from "@/lib/ui-context"

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
  const { mobileMenuOpen, setMobileMenuOpen, sidebarCollapsed } = useUI()

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false)
      }
    }
    
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [mobileMenuOpen, setMobileMenuOpen])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [mobileMenuOpen])

  return (
    <>
      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-16 z-50 h-[calc(100vh-4rem)] border-r border-border bg-background transition-all duration-300 ease-in-out",
        "md:z-30",
        // Mobile: always w-64, slide in from left
        "w-64",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        // Desktop: always visible, responsive width based on collapse state
        "md:translate-x-0 md:flex md:shrink-0",
        sidebarCollapsed ? "md:w-16" : "md:w-64"
      )}>
        <Sidebar onClose={() => setMobileMenuOpen(false)} />
      </aside>
    </>
  )
}

// Client component for main content area
function MainContentWrapper({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useUI()
  
  return (
    <main
      className={cn(
        "flex-1 transition-all duration-300 ease-in-out",
        // Mobile: no margin (sidebar is overlay)
        "ml-0",
        // Desktop: margin based on sidebar state
        sidebarCollapsed ? "md:ml-16" : "md:ml-64"
      )}
    >
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:max-w-7xl lg:px-8 lg:py-10">
        {children}
      </div>
    </main>
  )
}