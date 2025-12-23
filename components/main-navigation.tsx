"use client"

import Link from "next/link"
import { Search, Menu, X } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function MainNavigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isEdmonton = pathname?.includes("/edmonton")
  const isCalgary = pathname?.includes("/calgary")
  const isAdmin = pathname?.startsWith("/admin")

  // Don't show navigation on admin pages
  if (isAdmin) {
    return null
  }

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/articles?search=${encodeURIComponent(searchQuery.trim())}`)
      setMobileMenuOpen(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
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

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center justify-center gap-8">
          <Link
            href="/edmonton"
            className={`text-sm font-medium transition-colors ${isEdmonton
              ? "text-blue-600 hover:text-blue-700"
              : "text-gray-600 hover:text-gray-900"
              }`}
          >
            Edmonton
          </Link>
          <Link
            href="/calgary"
            className={`text-sm font-medium transition-colors ${isCalgary
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
          <Link href="/contact" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Contact
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          {/* Desktop Search */}
          <div className="hidden md:flex relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-9 w-[200px] bg-gray-50 border-gray-200 focus:bg-white"
            />
          </div>
          <Button
            onClick={handleSearch}
            className={`hidden md:inline-flex ${isEdmonton ? "bg-blue-600 hover:bg-blue-700" :
                isCalgary ? "bg-red-600 hover:bg-red-700" :
                  "bg-black hover:bg-gray-800"
              }`}
          >
            Search
          </Button>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-4">
            <Link
              href="/edmonton"
              onClick={closeMobileMenu}
              className={`text-base font-medium transition-colors py-2 ${isEdmonton
                ? "text-blue-600"
                : "text-gray-600"
                }`}
            >
              Edmonton
            </Link>
            <Link
              href="/calgary"
              onClick={closeMobileMenu}
              className={`text-base font-medium transition-colors py-2 ${isCalgary
                ? "text-red-600"
                : "text-gray-600"
                }`}
            >
              Calgary
            </Link>
            <Link
              href="/food-drink"
              onClick={closeMobileMenu}
              className="text-base font-medium text-gray-600 py-2"
            >
              Food & Drink
            </Link>
            <Link
              href="/events"
              onClick={closeMobileMenu}
              className="text-base font-medium text-gray-600 py-2"
            >
              Events
            </Link>
            <Link
              href="/culture"
              onClick={closeMobileMenu}
              className="text-base font-medium text-gray-600 py-2"
            >
              Culture
            </Link>
            <Link
              href="/best-of"
              onClick={closeMobileMenu}
              className="text-base font-medium text-gray-600 py-2"
            >
              Best of Alberta
            </Link>
            <Link
              href="/partner"
              onClick={closeMobileMenu}
              className="text-base font-medium text-gray-600 py-2"
            >
              Partner with Us
            </Link>
            <Link
              href="/contact"
              onClick={closeMobileMenu}
              className="text-base font-medium text-gray-600 py-2"
            >
              Contact
            </Link>

            {/* Mobile Search */}
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                type="search"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-9 w-full bg-gray-50 border-gray-200 focus:bg-white"
              />
            </div>
            <Button
              onClick={handleSearch}
              className={`w-full ${isEdmonton ? "bg-blue-600 hover:bg-blue-700" :
                  isCalgary ? "bg-red-600 hover:bg-red-700" :
                    "bg-black hover:bg-gray-800"
                }`}
            >
              Search
            </Button>
          </nav>
        </div>
      )}
    </header>
  )
}

