'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Check, MapPin } from 'lucide-react'
import { CITY_OPTIONS, CITY_FALLBACK, isValidCity } from '@/lib/alberta-municipalities'

interface CitySelectProps {
    id?: string
    value: string
    onChange: (city: string) => void
    disabled?: boolean
    placeholder?: string
}

/**
 * Searchable type-ahead picker for an Alberta municipality.
 * `value` is the committed selection ('' until a real option is chosen) so the
 * parent form can enforce a required city. Typing without selecting clears the
 * committed value.
 */
export function CitySelect({ id, value, onChange, disabled, placeholder = 'Start typing your city…' }: CitySelectProps) {
    const [query, setQuery] = useState(value)
    const [open, setOpen] = useState(false)
    const wrapRef = useRef<HTMLDivElement>(null)

    // Keep the input text in sync if the committed value changes from outside.
    useEffect(() => setQuery(value), [value])

    // Close on outside click and reset the text to the last valid selection.
    useEffect(() => {
        function onDocClick(e: MouseEvent) {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
                setOpen(false)
                setQuery(value)
            }
        }
        document.addEventListener('mousedown', onDocClick)
        return () => document.removeEventListener('mousedown', onDocClick)
    }, [value])

    const matches = useMemo(() => {
        const q = query.trim().toLowerCase()
        const list = q ? CITY_OPTIONS.filter((c) => c.toLowerCase().includes(q)) : CITY_OPTIONS
        // Always keep the catch-all reachable, even when filtered out.
        const withFallback = list.includes(CITY_FALLBACK) ? list : [...list, CITY_FALLBACK]
        return withFallback.slice(0, 60)
    }, [query])

    const select = (city: string) => {
        onChange(city)
        setQuery(city)
        setOpen(false)
    }

    return (
        <div ref={wrapRef} className="relative">
            <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                    id={id}
                    type="text"
                    role="combobox"
                    aria-expanded={open}
                    autoComplete="off"
                    value={query}
                    disabled={disabled}
                    placeholder={placeholder}
                    onFocus={() => setOpen(true)}
                    onChange={(e) => {
                        const v = e.target.value
                        setQuery(v)
                        setOpen(true)
                        // Typing invalidates the committed selection until they pick.
                        // isValidCity trims before matching, so commit the trimmed
                        // value — otherwise "Leduc " (trailing space) gets stored.
                        if (v !== value) onChange(isValidCity(v) ? v.trim() : '')
                    }}
                    className="w-full pl-11 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
                />
                <ChevronDown
                    className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </div>

            {open && (
                <ul
                    role="listbox"
                    className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg py-1"
                >
                    {matches.length === 0 ? (
                        <li className="px-4 py-2.5 text-sm text-gray-500">
                            No match — choose “{CITY_FALLBACK}”.
                        </li>
                    ) : (
                        matches.map((city) => {
                            const selected = city === value
                            return (
                                <li key={city}>
                                    <button
                                        type="button"
                                        onClick={() => select(city)}
                                        className={`w-full flex items-center justify-between gap-2 text-left px-4 py-2.5 text-sm hover:bg-blue-50 ${
                                            selected ? 'text-blue-700 font-semibold bg-blue-50' : 'text-gray-700'
                                        }`}
                                    >
                                        <span>{city}</span>
                                        {selected && <Check className="w-4 h-4 flex-shrink-0" />}
                                    </button>
                                </li>
                            )
                        })
                    )}
                </ul>
            )}
        </div>
    )
}
