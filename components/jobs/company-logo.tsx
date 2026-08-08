'use client'

import { useState } from 'react'

/**
 * Employer logo with a lettered fallback.
 *
 * Every job on the board gets a mark, even when no logo resolves — a row of
 * cards where only some have images looks broken, and a blank square looks
 * broken-er. The fallback derives a stable colour from the company name so the
 * same employer always reads the same way down a list.
 */

const TILE_COLOURS = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-800',
  'bg-violet-100 text-violet-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
  'bg-indigo-100 text-indigo-700',
]

/**
 * Employers whose fallback tile should echo their actual brand rather than take
 * a hashed colour — worth it where the mark is well known enough that a random
 * pastel square looks like a mistake.
 */
const BRAND_TILES: Record<string, string> = {
  "Hell's Kitchen at River Cree Resort": 'bg-neutral-900 text-white',
}

function tileColour(name: string): string {
  if (BRAND_TILES[name]) return BRAND_TILES[name]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return TILE_COLOURS[Math.abs(hash) % TILE_COLOURS.length]
}

/** Up to two initials: "Neo Financial" → NF, "SAIT" → S. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(w => /[a-z0-9]/i.test(w))
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0][0].toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

export function CompanyLogo({
  company,
  domain,
  src,
  size = 48,
  className = '',
}: {
  company: string
  domain?: string | null
  /** Locally hosted logo. Preferred over `domain` when present. */
  src?: string | null
  size?: number
  className?: string
}) {
  // Two-stage fallback: a hosted file, then the domain's favicon, then the
  // lettered tile. A missing local asset degrades instead of breaking.
  const [localFailed, setLocalFailed] = useState(false)
  const [failed, setFailed] = useState(false)

  const useLocal = !!src && !localFailed
  const resolved = useLocal
    ? src
    : domain
      ? `/api/company-logo?domain=${encodeURIComponent(domain)}`
      : null
  const showImage = !!resolved && (useLocal || !failed)

  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white ${className}`}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <img
          src={resolved!}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => (useLocal ? setLocalFailed(true) : setFailed(true))}
          className="h-full w-full object-contain p-1.5"
        />
      ) : (
        <span
          className={`flex h-full w-full items-center justify-center font-bold ${tileColour(company)}`}
          style={{ fontSize: Math.round(size * 0.36) }}
          aria-hidden="true"
        >
          {initials(company)}
        </span>
      )}
    </div>
  )
}
