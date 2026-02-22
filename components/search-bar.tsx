'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

interface SearchBarProps {
  /** Accent color variant - affects the search button */
  variant?: 'default' | 'edmonton' | 'calgary' | 'alberta'
  className?: string
}

const variantStyles = {
  default: 'bg-gray-900 hover:bg-gray-800',
  edmonton: 'bg-blue-600 hover:bg-blue-700',
  calgary: 'bg-red-600 hover:bg-red-700',
  alberta: 'bg-amber-600 hover:bg-amber-700',
}

export function SearchBar({ variant = 'default', className = '' }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/articles?search=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles, events, culture..."
            className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all"
          />
        </div>
        <button
          type="submit"
          className={`px-6 py-3 rounded-xl font-semibold text-white transition-colors flex items-center gap-2 shrink-0 shadow-sm ${variantStyles[variant]}`}
        >
          <Search className="h-5 w-5" />
          Search
        </button>
      </div>
    </form>
  )
}
