'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Loader2, MapPin, X } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { CitySelect } from '@/components/city-select'
import { isValidCity } from '@/lib/alberta-municipalities'

const DISMISS_KEY = 'city-prompt-dismissed'

/**
 * Asks a signed-in reader for their city when their account doesn't have one.
 * This covers Google/Facebook signups (which skip the signup form) and any
 * accounts created before the city field existed. Saved to user_metadata.city.
 */
export function CityPrompt() {
    const { user, loading } = useAuth()
    const pathname = usePathname()

    const [city, setCity] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [dismissed, setDismissed] = useState(true) // assume dismissed until we read storage

    useEffect(() => {
        try {
            setDismissed(window.sessionStorage.getItem(DISMISS_KEY) === '1')
        } catch {
            setDismissed(false)
        }
    }, [])

    // Don't interrupt the auth pages or the admin area.
    const onExcludedRoute = pathname?.startsWith('/auth') || pathname?.startsWith('/admin')

    const hasCity = !!(user?.user_metadata as { city?: string } | undefined)?.city
    const show = !loading && !!user && !hasCity && !dismissed && !onExcludedRoute

    if (!show) return null

    const dismiss = () => {
        try {
            window.sessionStorage.setItem(DISMISS_KEY, '1')
        } catch {
            /* ignore */
        }
        setDismissed(true)
    }

    const save = async () => {
        if (!isValidCity(city)) {
            setError('Please choose your city from the list.')
            return
        }
        setSaving(true)
        setError('')
        try {
            const { error: updErr } = await supabaseBrowser.auth.updateUser({ data: { city } })
            if (updErr) throw updErr
            // onAuthStateChange (USER_UPDATED) refreshes `user`, which hides this prompt.
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save your city. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
                <button
                    type="button"
                    onClick={dismiss}
                    disabled={saving}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    aria-label="Not now"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <h3 className="text-xl font-bold text-gray-900">What’s your city?</h3>
                </div>
                <p className="text-sm text-gray-500 mb-5">
                    Tell us where you’re based so we can show you Alberta culture, food, and events near you.
                </p>

                <CitySelect value={city} onChange={setCity} disabled={saving} />

                {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

                <button
                    type="button"
                    onClick={save}
                    disabled={saving}
                    className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50"
                >
                    {saving && <Loader2 className="w-5 h-5 animate-spin" />}
                    Save my city
                </button>

                <button
                    type="button"
                    onClick={dismiss}
                    disabled={saving}
                    className="mt-2 w-full text-sm font-medium text-gray-500 hover:text-gray-700 py-1.5 disabled:opacity-50"
                >
                    Not now
                </button>
            </div>
        </div>
    )
}
