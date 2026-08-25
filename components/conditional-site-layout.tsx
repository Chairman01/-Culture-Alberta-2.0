'use client'

import { usePathname } from 'next/navigation'
import { MainNavigation } from '@/components/main-navigation'
import { Footer } from '@/components/footer'

export function ConditionalSiteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // The draft preview is the one /admin page that must NOT look like the admin
  // area — its whole job is showing an editor what a reader will see, and a
  // preview wearing the admin chrome answers a different question. It keeps the
  // site header and footer; the admin sidebar is dropped in app/admin/layout.
  const isDraftPreview = pathname?.startsWith('/admin/preview')
  const isAdmin = pathname?.startsWith('/admin') && !isDraftPreview
  const isLinkInBio = pathname?.startsWith('/link-in-bio')

  if (isAdmin || isLinkInBio) {
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
