'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { trackPageView } from '@/lib/analytics'

interface PageTrackerProps {
  title?: string
}

export function PageTracker({ title }: PageTrackerProps) {
  const pathname = usePathname()
  
  useEffect(() => {
    const pageTitle = title || document.title || 'Culture Alberta'
    trackPageView(pathname, pageTitle)
  }, [pathname, title])
  
  return null // This component doesn't render anything
}
