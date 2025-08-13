"use client"

import Link from "next/link"
import { Search } from "lucide-react"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function MainNavigation() {
  const pathname = usePathname()
  const isEdmonton = pathname?.includes("/edmonton")
  const isCalgary = pathname?.includes("/calgary")
  const isAdmin = pathname?.startsWith("/admin")
  
  // Don't show navigation on admin pages
  if (isAdmin) {
    return null
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <span
              className={`text-2xl font-bold ${isEdmonton ? "text-blue-600" : isCalgary ? "text-red-600" : "text-primary"}`}
            >
              Culture Alberta
            </span>
          </Link>
        </div>
        
        <nav className="hidden md:flex items-center justify-center gap-8">
          <Link
            href="/edmonton"
            className={`text-sm font-medium transition-colors ${
              isEdmonton 
                ? "text-blue-600 hover:text-blue-700" 
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Edmonton
          </Link>
          <Link
            href="/calgary"
            className={`text-sm font-medium transition-colors ${
              isCalgary 
                ? "text-red-600 hover:text-red-700" 
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Calgary
          </Link>
          <Link href="/food-drink" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Food & Drink
          </Link>
          <Link href="/events" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Events
          </Link>
          <Link href="/culture" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Culture
          </Link>
          <Link href="/best-of" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Best of Alberta
          </Link>
          <Link href="/partner" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Partner with Us
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input 
              type="search" 
              placeholder="Search..." 
              className="pl-9 w-[200px] bg-gray-50 border-gray-200 focus:bg-white"
            />
          </div>
          <Button className={isEdmonton ? "bg-blue-600 hover:bg-blue-700" : "bg-black hover:bg-gray-800"}>
            Subscribe
          </Button>
        </div>
      </div>
    </header>
  )
}
