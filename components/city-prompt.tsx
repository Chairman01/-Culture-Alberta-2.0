'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Loader2, MapPin } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { CitySelect } from '@/components/city-select'
import { isValidCity } from '@/lib/alberta-municipalities'

/**
 * Mandatory city gate. Any signed-in user without a city (email or social
 * signups, and older accounts) must choose one before they can use the site.
 * There's no dismiss — the only way out without a city is to sign out. This is
 * how we enforce "a city is required" for OAuth, where Supabase creates the auth
 * account the moment the user authorizes and we can't block that step itself.
 */
export function CityPrompt() {
    const { user, loading, signOut } = useAuth()
    const pathname = usePathname()

    const [city, setCity] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    // Don't gate the auth pages or the admin area.
    const onExcludedRoute = pathname?.startsWith('/auth') || pathname?.startsWith('/admin')

    const hasCity = !!(user?.user_metadata as { city?: string } | undefined)?.city
    const show = !loading && !!user && !hasCity && !onExcludedRoute

    if (!show) return null

    const save = async () => {
        if (!isValidCity(city)) {
            setError('Please choose your city from the list.')
            return
        }
        setSaving(true)
        setError('')
        try {
            const { error: updErr } = await supabaseBrowser.auth.updateUser({ data: { city: city.trim() } })
            if (updErr) throw updErr
            // onAuthStateChange (USER_UPDATED) refreshes `user`, which hides this gate.
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save your city. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <h3 className="text-xl font-bold text-gray-900">One last step — add your city</h3>
                </div>
                <p className="text-sm text-gray-500 mb-5">
                    A city is required to finish your account. We use it to show you Alberta
                    culture, food, and events near you.
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
                    Save and continue
                </button>

                <p className="mt-3 text-center text-xs text-gray-400">
                    Don’t want to add a city?{' '}
                    <button
                        type="button"
                        onClick={() => signOut()}
                        disabled={saving}
                        className="underline hover:text-gray-600 disabled:opacity-50"
                    >
                        Sign out
                    </button>
                </p>
            </div>
        </div>
    )
}
