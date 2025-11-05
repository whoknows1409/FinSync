// components/layout/header.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useTheme } from "next-themes"
import { Moon, Sun, Bell, User, Settings as SettingsIcon, LogOut, Menu } from "lucide-react"
import { LoginForm } from "@/components/auth/login-form"
import { SignupForm } from "@/components/auth/signup-form"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUI } from "@/lib/ui-context"
import Image from "next/image"

// Custom Logo Component using the new logo image
function FinsyncLogo() {
  return (
    <div className="h-10 w-10 flex items-center justify-center">
      <Image
        src="/finsync-logo.svg"
        alt="FinSync Logo"
        width={40}
        height={40}
        className="object-contain"
        priority
      />
    </div>
  )
}

export function Header() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState<"login" | "signup">("login")
  const pathname = usePathname()
  const { toggleMobileMenu } = useUI()

  const toggleAuthMode = () => {
    setAuthMode(authMode === "login" ? "signup" : "login")
  }

  const handleLogout = () => {
    logout()
    // Optional: Redirect to home page after logout
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Mobile menu button - only show when user is logged in */}
            {user && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMobileMenu}
                className="md:hidden hover:bg-blue-50 dark:hover:bg-blue-950"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            )}
            
            <div className="flex items-center space-x-2">
              <FinsyncLogo />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                Finsync
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="hover:bg-blue-50 dark:hover:bg-blue-950"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            {user && (
              <>
                <Button variant="ghost" size="icon" asChild>
                  <Link href="/notifications" className="flex items-center justify-center">
                    <Bell className="h-5 w-5" />
                  </Link>
                </Button>
                
                <Button variant="ghost" size="icon" asChild>
                  <Link href="/profile" className="flex items-center justify-center">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.profileImage || ""} />
                      <AvatarFallback className="text-sm bg-blue-500 text-white">
                        {user.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                </Button>
                
                <Button variant="ghost" size="icon" asChild>
                  <Link href="/settings" className="flex items-center justify-center">
                    <SettingsIcon className="h-5 w-5" />
                  </Link>
                </Button>
                
                <Button variant="ghost" size="icon" onClick={handleLogout}>
                  <LogOut className="h-5 w-5" />
                </Button>
              </>
            )}

            {!user && (
              <div className="flex items-center gap-2 sm:gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setAuthMode("login")
                    setShowAuth(true)
                  }}
                >
                  Login
                </Button>
                <Button
                  onClick={() => {
                    setAuthMode("signup")
                    setShowAuth(true)
                  }}
                >
                  Sign Up
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Custom Modal Implementation */}
      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="p-6">
              {authMode === "login" ? (
                <LoginForm onToggleMode={toggleAuthMode} />
              ) : (
                <SignupForm onToggleMode={toggleAuthMode} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}