"use client"

import Link from "next/link"
import { Menu, X, User, LogOut } from "lucide-react"
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
      <div className="container mx-auto flex h-14 sm:h-16 items-center px-3 sm:px-4 gap-4">
        <Link href="/" className="flex items-center shrink-0">
          <span
            className={`text-lg sm:text-2xl font-bold whitespace-nowrap ${isEdmonton ? "text-blue-600" : isCalgary ? "text-red-600" : isAlberta ? "text-amber-700" : "text-primary"}`}
          >
            Culture Alberta
          </span>
        </Link>

        {/* Desktop Navigation - centered */}
        <nav className="hidden md:flex flex-1 items-center justify-center gap-6 lg:gap-8">
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

        <div className="flex items-center gap-2 shrink-0">
          {/* Auth - single user icon links to sign-in (or account when logged in) */}
          <div className="flex items-center gap-2">
            {loading ? (
              <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse" aria-hidden />
            ) : user ? (
              <div className="flex items-center gap-1">
                <div
                  className="flex items-center justify-center min-w-[44px] min-h-[44px] w-10 h-10 sm:w-9 sm:h-9 rounded-full border border-gray-200 bg-gray-50"
                  title={user.user_metadata?.full_name || user.email}
                  aria-label="Account"
                >
                  <User className="w-5 h-5 sm:w-4 sm:h-4 text-gray-600" />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => signOut()}
                  className="text-gray-600 hover:text-gray-900 min-w-[44px] min-h-[44px] w-10 h-10 sm:w-9 sm:h-9 touch-manipulation"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Link
                href="/auth/signin"
                className="flex items-center justify-center min-w-[44px] min-h-[44px] w-10 h-10 sm:w-9 sm:h-9 rounded-full border border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
                aria-label="Sign in"
              >
                <User className="w-5 h-5 sm:w-4 sm:h-4 text-gray-600" />
              </Link>
            )}
          </div>

          {/* Mobile Menu Button - 44px touch target */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden min-w-[44px] min-h-[44px] touch-manipulation"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu - touch-friendly link heights */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background max-h-[calc(100vh-3.5rem)] overflow-y-auto">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-0">
            <Link
              href="/edmonton"
              onClick={closeMobileMenu}
              className={`text-base font-medium transition-colors py-3.5 min-h-[44px] flex items-center touch-manipulation ${isEdmonton
                ? "text-blue-600"
                : "text-gray-600"
                }`}
            >
              Edmonton
            </Link>
            <Link
              href="/calgary"
              onClick={closeMobileMenu}
              className={`text-base font-medium transition-colors py-3.5 min-h-[44px] flex items-center touch-manipulation ${isCalgary
                ? "text-red-600"
                : "text-gray-600"
                }`}
            >
              Calgary
            </Link>
            <Link
              href="/alberta"
              onClick={closeMobileMenu}
              className={`text-base font-medium transition-colors py-3.5 min-h-[44px] flex items-center touch-manipulation ${isAlberta
                ? "text-amber-700"
                : "text-gray-600"
                }`}
            >
              Alberta
            </Link>
            <Link
              href="/food-drink"
              onClick={closeMobileMenu}
              className="text-base font-medium text-gray-600 py-3.5 min-h-[44px] flex items-center touch-manipulation"
            >
              Food & Drink
            </Link>
            <Link
              href="/events"
              onClick={closeMobileMenu}
              className="text-base font-medium text-gray-600 py-3.5 min-h-[44px] flex items-center touch-manipulation"
            >
              Events
            </Link>
            <Link
              href="/culture"
              onClick={closeMobileMenu}
              className="text-base font-medium text-gray-600 py-3.5 min-h-[44px] flex items-center touch-manipulation"
            >
              Culture
            </Link>
            <Link
              href="/best-of"
              onClick={closeMobileMenu}
              className="text-base font-medium text-gray-600 py-3.5 min-h-[44px] flex items-center touch-manipulation"
            >
              Best of Alberta
            </Link>
            <Link
              href="/partner"
              onClick={closeMobileMenu}
              className="text-base font-medium text-gray-600 py-3.5 min-h-[44px] flex items-center touch-manipulation"
            >
              Partner with Us
            </Link>

            {/* Mobile Auth - compact */}
            <div className="flex items-center gap-2 pt-4 border-t mt-4">
              {loading ? (
                <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse" aria-hidden />
              ) : user ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { signOut(); closeMobileMenu(); }}
                  className="gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
              ) : (
                <Link href="/auth/signin" onClick={closeMobileMenu} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium">
                  <User className="w-4 h-4" />
                  Sign In
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

