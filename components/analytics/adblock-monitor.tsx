'use client'

import { useEffect } from 'react'

/**
 * Silent ad-block measurement. Renders nothing and shows the reader nothing.
 *
 * Runs once per session, not per pageview: one beacon per visitor keeps the
 * Vercel invocation cost negligible and a session is the right unit anyway —
 * a reader either has a blocker on or they don't.
 *
 * Two independent probes, because either alone misfires:
 *
 *   1. A bait element with ad-shaped class names. Cosmetic filtering hides it.
 *      Alone this is unreliable — some themes and privacy browsers hide such
 *      elements without blocking network requests.
 *   2. A request for /ads.js, a real but empty file on our own domain. Filter
 *      lists block that path by name. Alone this misses cosmetic-only setups
 *      and can false-positive on flaky networks.
 *
 * Either firing counts as blocked, which biases slightly toward over-counting.
 * That's the safer error: it would argue for acting on a problem rather than
 * quietly telling us there isn't one.
 */

const SESSION_KEY = 'ca_adblock_measured'
const BAIT_CLASSES = 'adsbox ad-banner ad-placement pub_300x250 sponsored-ad'

async function probeNetwork(): Promise<boolean> {
  try {
    await fetch('/ads.js', { method: 'HEAD', cache: 'no-store' })
    return false // request went through — nothing blocking it
  } catch {
    return true // blocked (or offline, which the bait probe disambiguates)
  }
}

function probeCosmetic(): boolean {
  const bait = document.createElement('div')
  bait.className = BAIT_CLASSES
  bait.setAttribute('aria-hidden', 'true')
  // Off-screen rather than display:none, so our own styling can't be mistaken
  // for a blocker hiding it.
  bait.style.cssText =
    'position:absolute;left:-9999px;top:-9999px;width:300px;height:250px;pointer-events:none'
  document.body.appendChild(bait)

  // Blockers apply cosmetic rules synchronously on insert in practice, but
  // read after a frame so layout has settled.
  const hidden =
    bait.offsetHeight === 0 ||
    bait.offsetParent === null ||
    getComputedStyle(bait).display === 'none' ||
    getComputedStyle(bait).visibility === 'hidden'

  bait.remove()
  return hidden
}

export function AdBlockMonitor() {
  useEffect(() => {
    // Once per session.
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return
      sessionStorage.setItem(SESSION_KEY, '1')
    } catch {
      return // storage unavailable (private mode) — skip rather than double-count
    }

    let cancelled = false

    const measure = async () => {
      // Give ad scripts and any blocker a moment to settle before probing.
      await new Promise(r => setTimeout(r, 2500))
      if (cancelled) return

      let blocked = false
      try {
        const [network, cosmetic] = await Promise.all([
          probeNetwork(),
          Promise.resolve().then(probeCosmetic),
        ])
        blocked = network || cosmetic
      } catch {
        return // never let measurement throw into the page
      }
      if (cancelled) return

      const device = window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop'
      const payload = JSON.stringify({ blocked, device })

      try {
        // Beacon survives the reader navigating away mid-flight.
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/adblock', new Blob([payload], { type: 'application/json' }))
        } else {
          void fetch('/api/adblock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
          })
        }
      } catch {
        // Measurement is best-effort by design.
      }
    }

    // requestIdleCallback where available so this never competes with render.
    const idle = (window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
    }).requestIdleCallback
    if (idle) idle(() => void measure(), { timeout: 5000 })
    else setTimeout(() => void measure(), 3000)

    return () => { cancelled = true }
  }, [])

  return null
}
