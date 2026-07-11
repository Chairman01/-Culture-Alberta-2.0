'use client'

import { useEffect } from 'react'

/**
 * Ensures Instagram and Twitter embeds actually render.
 *
 * 1. If the page contains embed blockquotes but the platform script hasn't
 *    loaded yet (lazyOnload timing, client-side navigation), inject it.
 * 2. Call the processors once the scripts are available, with retries for
 *    slow connections.
 */
export function ArticleEmbedActivator() {
  useEffect(() => {
    const ensureScript = (id: string, src: string, isLoaded: () => boolean) => {
      if (isLoaded() || document.getElementById(id)) return
      const script = document.createElement('script')
      script.id = id
      script.src = src
      script.async = true
      document.body.appendChild(script)
    }

    const process = () => {
      if ((window as any).instgrm?.Embeds) {
        (window as any).instgrm.Embeds.process()
      }
      if ((window as any).twttr?.widgets) {
        (window as any).twttr.widgets.load()
      }
    }

    if (document.querySelector('blockquote.instagram-media')) {
      ensureScript('ig-embed-js', 'https://www.instagram.com/embed.js', () => !!(window as any).instgrm)
    }
    if (document.querySelector('blockquote.twitter-tweet')) {
      ensureScript('tw-widgets-js', 'https://platform.twitter.com/widgets.js', () => !!(window as any).twttr)
    }

    // Run immediately in case scripts are already loaded, then retry a few
    // times while the injected scripts finish loading
    process()
    const timers = [1500, 3500, 7000].map(ms => setTimeout(process, ms))
    return () => timers.forEach(clearTimeout)
  }, [])

  return null
}
