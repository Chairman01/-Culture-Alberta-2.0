"use client"

import { MainNavigation } from "@/components/main-navigation"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <MainNavigation />
      <main>{children}</main>
    </div>
  )
} 