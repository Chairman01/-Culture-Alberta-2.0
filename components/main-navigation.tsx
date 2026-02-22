"use client"

import Link from "next/link"
import { Menu, X, LogIn, UserPlus, LogOut } from "lucide-react"
import { usePathname } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"

export function MainNavigation() {
  const pathname = usePathname()
  const { user, loading, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isEdmonton = pathname?.includes("/edmonton")
  const isCalgary = pathname?.includes("/calgary")
  const isAlberta = pathname?.includes("/alberta")
  const isAdmin = pathname?.startsWith("/admin")

  // Don't show navigation on admin pages
  if (isAdmin) {
    return null
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
              className={`text-2xl font-bold ${isEdmonton ? "text-blue-600" : isCalgary ? "text-red-600" : isAlberta ? "text-amber-700" : "text-primary"}`}
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
          <Link
            href="/alberta"
            className={`text-sm font-medium transition-colors ${isAlberta
              ? "text-amber-700 hover:text-amber-800"
              : "text-gray-600 hover:text-gray-900"
              }`}
          >
            Alberta
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
          {/* Auth links - Desktop */}
          <div className="hidden md:flex items-center gap-2">
            {loading ? (
              <span className="text-sm text-gray-500">...</span>
            ) : user ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 truncate max-w-[120px]" title={user.email}>
                  {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Account'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut()}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <Link href="/auth/signin">
                  <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                    <LogIn className="w-4 h-4 mr-1" />
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button size="sm" className="bg-gray-900 hover:bg-black">
                    <UserPlus className="w-4 h-4 mr-1" />
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>

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
              href="/alberta"
              onClick={closeMobileMenu}
              className={`text-base font-medium transition-colors py-2 ${isAlberta
                ? "text-amber-700"
                : "text-gray-600"
                }`}
            >
              Alberta
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

            {/* Mobile Auth links */}
            <div className="flex flex-col gap-2 pt-4 border-t mt-4">
              {loading ? (
                <span className="text-sm text-gray-500">...</span>
              ) : user ? (
                <Button variant="ghost" onClick={() => { signOut(); closeMobileMenu(); }}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              ) : (
                <>
                  <Link href="/auth/signin" onClick={closeMobileMenu}>
                    <Button variant="ghost" className="w-full justify-start">
                      <LogIn className="w-4 h-4 mr-2" />
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/auth/signup" onClick={closeMobileMenu}>
                    <Button className="w-full bg-gray-900 hover:bg-black">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

