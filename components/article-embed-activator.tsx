'use client'

import { useEffect } from 'react'

/**
 * Calls Instagram and Twitter embed processors after the article content
 * mounts. Required because Next.js client-side navigation doesn't re-run
 * lazyOnload scripts, so blockquotes inserted into the DOM are never processed.
 */
export function ArticleEmbedActivator() {
  useEffect(() => {
    const process = () => {
      if ((window as any).instgrm?.Embeds) {
        (window as any).instgrm.Embeds.process()
      }
      if ((window as any).twttr?.widgets) {
        (window as any).twttr.widgets.load()
      }
    }

    // Run immediately in case scripts are already loaded
    process()

    // Retry after 1.5 s for slow connections where the scripts haven't
    // finished loading yet by the time the content renders
    const timer = setTimeout(process, 1500)
    return () => clearTimeout(timer)
  }, [])

  return null
}
