"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  LayoutDashboard,
  Receipt,
  PiggyBank,
  BarChart3,
  TrendingUp,
  MessageSquare,
  Gamepad2,
  ChevronLeft,
  ChevronRight,
  Target,
  Wallet,
  PieChart,
  X
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUI } from "@/lib/ui-context"

interface SidebarProps {
  onClose?: () => void
}

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    badge: null,
  },
  {
    name: "Transactions",
    href: "/transactions",
    icon: Receipt,
    badge: null, // Removed "12" badge
  },
  {
    name: "Budget",
    href: "/budget",
    icon: PiggyBank,
    badge: null,
  },
  {
    name: "Analysis",
    href: "/analysis",
    icon: BarChart3,
    badge: null,
  },
  {
    name: "Stock Analysis",
    href: "/stocks",
    icon: TrendingUp,
    badge: null, // Removed "Live" badge
  },
  {
    name: "Paper Trading",
    href: "/trading",
    icon: Gamepad2,
    badge: null, // Removed "₹10L" badge
  },
  {
    name: "AI Chatbot",
    href: "/chatbot",
    icon: MessageSquare,
    badge: "AI", // Keeping AI badge but making it blue
  },
]

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname()
  const { sidebarCollapsed, toggleSidebar } = useUI()

  const handleNavClick = () => {
    // Close mobile menu when clicking a nav item
    if (onClose) {
      onClose()
    }
  }

  return (
    <div className={cn(
      "pb-12 transition-all duration-300 h-full flex flex-col bg-background border-r border-border w-64",
      // Only apply collapse on desktop
      "md:w-auto",
      sidebarCollapsed && "md:w-16"
    )}>
      <div className="space-y-4 py-4 h-full flex flex-col">
        <div className="px-3 py-2 flex items-center justify-between">
          {/* Desktop collapse button */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleSidebar} 
            className="hidden md:flex w-full justify-center"
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
          
          {/* Mobile close button */}
          {onClose && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="md:hidden w-full justify-center"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="px-3 py-2 flex-1">
          <div className="space-y-1">
            {navigation.map((item) => (
              <Button
                key={item.name}
                variant={pathname === item.href ? "secondary" : "ghost"}
                className={cn(
                  "w-full transition-all duration-200 group relative py-3",
                  // On mobile, always show full width with text
                  "justify-start px-3",
                  // On desktop, apply collapse behavior
                  "md:justify-start md:px-3",
                  sidebarCollapsed && "md:justify-center md:px-2",
                  pathname === item.href && "bg-secondary text-secondary-foreground",
                  "hover:bg-accent hover:text-accent-foreground"
                )}
                asChild
                title={sidebarCollapsed ? item.name : undefined}
                onClick={handleNavClick}
              >
                <Link href={item.href} className="flex items-center w-full">
                  <div className={cn(
                    "flex items-center justify-center p-2 rounded-lg",
                    pathname === item.href 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground group-hover:text-foreground group-hover:bg-muted"
                  )}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  {/* Always show text on mobile, conditionally on desktop */}
                  <div className={cn(
                    "flex items-center justify-between w-full ml-3",
                    sidebarCollapsed && "md:hidden"
                  )}>
                    <span className="font-medium">{item.name}</span>
                    {item.badge && (
                      <Badge 
                        variant={item.badge === "AI" ? "default" : "secondary"} 
                        className={cn(
                          "text-xs px-2 py-0.5",
                          item.badge === "AI" && "bg-blue-500 hover:bg-blue-600 text-white"
                        )}
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                  {/* Collapsed state badge (desktop only) */}
                  {sidebarCollapsed && item.badge && (
                    <Badge 
                      variant={item.badge === "AI" ? "default" : "secondary"} 
                      className={cn(
                        "hidden md:flex absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs items-center justify-center",
                        item.badge === "AI" && "bg-blue-500 hover:bg-blue-600 text-white"
                      )}
                    >
                      {item.badge === "AI" ? "AI" : 
                       item.badge === "₹10L" ? "₹" : 
                       item.badge === "Live" ? "L" : item.badge}
                    </Badge>
                  )}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  ) 
}