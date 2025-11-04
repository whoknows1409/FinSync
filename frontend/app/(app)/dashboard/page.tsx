// app/(app)/dashboard/page.tsx
"use client"

import { DraggableDashboard } from "@/components/dashboard/draggable-dashboard"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <DraggableDashboard />
    </div>
  )
}