'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const TIER1 = [
  { slug: 'red-deer', name: 'Red Deer' },
  { slug: 'lethbridge', name: 'Lethbridge' },
  { slug: 'medicine-hat', name: 'Medicine Hat' },
  { slug: 'grande-prairie', name: 'Grande Prairie' },
]

export function AlbertaLocationFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value
    if (!v) {
      router.push('/alberta')
      return
    }
    if (v === 'other') {
      router.push('/alberta/all-articles?filter=other')
      return
    }
    const tier1 = TIER1.find((c) => c.slug === v)
    if (tier1) {
      router.push(`/${tier1.slug}`)
    }
  }

  const filter = searchParams.get('filter') || ''
  const current = filter === 'other' ? 'other' : ''

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground flex items-center gap-1">Filter by location:</span>
      <select
        className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
        value={current}
        onChange={handleChange}
      >
        <option value="">All locations</option>
        {TIER1.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
        <option value="other">Other Communities</option>
      </select>
    </div>
  )
}
