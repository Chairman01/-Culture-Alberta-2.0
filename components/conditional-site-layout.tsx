'use client'

import { usePathname } from 'next/navigation'
import { MainNavigation } from '@/components/main-navigation'
import { Footer } from '@/components/footer'

export function ConditionalSiteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith('/admin')

  if (isAdmin) {
    return <>{children}</>
  }

  return (
    <>
      <MainNavigation />
      <main>{children}</main>
      <Footer />
    </>
  )
}
