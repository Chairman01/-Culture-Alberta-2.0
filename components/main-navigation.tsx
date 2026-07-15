"use client"

import Link from "next/link"
import { Menu, X, User, LogOut, ChevronDown } from "lucide-react"
import { CITY_PAGES } from "@/lib/city-pages"
import { usePathname } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import { NotificationsBell } from "@/components/notifications-bell"

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
          <div className="relative group">
            <Link
              href="/alberta"
              className={`inline-flex items-center gap-1 text-sm font-medium transition-colors ${isAlberta
                ? "text-amber-700 hover:text-amber-800"
                : "text-gray-600 hover:text-gray-900"
                }`}
            >
              Alberta
              <ChevronDown className="w-3.5 h-3.5 transition-transform group-hover:rotate-180" />
            </Link>
            {/* Hover dropdown — other Alberta municipalities */}
            <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 hidden group-hover:block z-50">
              <div className="w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2">
                <Link href="/alberta" className="block px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50">
                  All of Alberta
                </Link>
                <div className="my-1 border-t border-gray-100" />
                {Object.values(CITY_PAGES).map((c) => (
                  <Link
                    key={c.slug}
                    href={`/${c.slug}`}
                    className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <Link href="/food-drink" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Food & Drink
          </Link>
          <Link href="/events" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Events
          </Link>
          <Link href="/jobs" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Jobs
          </Link>
          <Link href="/culture" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Culture
          </Link>
          <Link href="/tools" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Tools
          </Link>
          <Link href="/shop" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Shop
          </Link>
          <Link href="/partner" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Partner with Us
          </Link>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {/* Auth - single user icon links to sign-in (or account when logged in) */}
          <div className="flex items-center gap-2">
            {loading ? (
              <div className="min-w-[44px] min-h-[44px] w-10 h-10 sm:w-9 sm:h-9 rounded-full bg-gray-200 animate-pulse" aria-hidden />
            ) : user ? (
              <div className="flex items-center gap-1">
                <NotificationsBell />
                <Link
                  href="/account"
                  className="flex items-center justify-center min-w-[44px] min-h-[44px] w-10 h-10 sm:w-9 sm:h-9 rounded-full border border-gray-200 bg-gray-50 overflow-hidden hover:bg-gray-100 transition-colors"
                  title={user.user_metadata?.full_name || user.email}
                  aria-label="Your account"
                >
                  {user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={(user.user_metadata.avatar_url || user.user_metadata.picture) as string}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 sm:w-4 sm:h-4 text-gray-600" />
                  )}
                </Link>
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
            {/* Other municipalities, nested under Alberta */}
            <div className="flex flex-col border-l-2 border-gray-100 ml-2 pl-3">
              {Object.values(CITY_PAGES).map((c) => (
                <Link
                  key={c.slug}
                  href={`/${c.slug}`}
                  onClick={closeMobileMenu}
                  className="text-sm font-medium text-gray-500 hover:text-gray-800 py-2.5 min-h-[40px] flex items-center touch-manipulation"
                >
                  {c.name}
                </Link>
              ))}
            </div>
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
              href="/jobs"
              onClick={closeMobileMenu}
              className="text-base font-medium text-gray-600 py-3.5 min-h-[44px] flex items-center touch-manipulation"
            >
              Jobs
            </Link>
            <Link
              href="/culture"
              onClick={closeMobileMenu}
              className="text-base font-medium text-gray-600 py-3.5 min-h-[44px] flex items-center touch-manipulation"
            >
              Culture
            </Link>
            <Link
              href="/tools"
              onClick={closeMobileMenu}
              className="text-base font-medium text-gray-600 py-3.5 min-h-[44px] flex items-center touch-manipulation"
            >
              Tools
            </Link>
            <Link
              href="/shop"
              onClick={closeMobileMenu}
              className="text-base font-medium text-gray-600 py-3.5 min-h-[44px] flex items-center touch-manipulation"
            >
              Shop
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
                <div className="flex items-center gap-3">
                  <Link
                    href="/account"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium"
                  >
                    <User className="w-4 h-4" />
                    My Account
                  </Link>
                  <span className="text-gray-300">|</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { signOut(); closeMobileMenu(); }}
                    className="gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </Button>
                </div>
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

