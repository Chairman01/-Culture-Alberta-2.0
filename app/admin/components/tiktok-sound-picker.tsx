"use client"

/**
 * TikTok sound picker for the article editor.
 *
 * Lists TikTok's trending Commercial Music Library sounds (via PostFast), lets
 * the editor play a preview, pick one for this article, or make one the
 * default for every article without its own pick.
 *
 * value: the article's own pick, or null to use the default.
 * The parent sends `tiktokSound` with the save: an object to set, null to clear.
 */

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface SoundChoice {
  musicSoundId: string
  name?: string | null
  artist?: string | null
}

interface Sound {
  musicSoundId: string
  name: string
  artist?: string
  duration?: number
  thumbnailUrl?: string
  previewUrl?: string
  rankPosition?: number
}

const RANGES = [
  { value: "1DAY", label: "Today" },
  { value: "7DAY", label: "This week" },
  { value: "30DAY", label: "This month" },
]

const label = (s?: SoundChoice | null) =>
  s ? `${s.name ?? "Chosen sound"}${s.artist ? ` — ${s.artist}` : ""}` : ""

export function TikTokSoundPicker({
  value,
  onChange,
}: {
  value: SoundChoice | null
  onChange: (next: SoundChoice | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [sounds, setSounds] = useState<Sound[]>([])
  const [defaultSound, setDefaultSound] = useState<SoundChoice | null>(null)
  const [range, setRange] = useState("7DAY")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [playing, setPlaying] = useState<string | null>(null)
  const [savingDefault, setSavingDefault] = useState<string | null>(null)
  // Buffer reminders / Zernio drafts: the sound is added in the TikTok app.
  const [handFinished, setHandFinished] = useState(false)
  const audio = useRef<HTMLAudioElement | null>(null)

  // Load the default once, so the collapsed box can say what will play.
  useEffect(() => {
    fetch("/api/admin/tiktok/sounds?dateRange=7DAY")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return
        if (d.handFinished) {
          setHandFinished(true)
          return
        }
        setDefaultSound(d.defaultSound ?? null)
        if (Array.isArray(d.sounds)) setSounds(d.sounds)
        if (d.error) setError(d.error)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    fetch(`/api/admin/tiktok/sounds?dateRange=${range}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}))
        if (r.status === 401 || r.status === 403) throw new Error("Only admins can pick TikTok sounds.")
        if (d.error) setError(d.error)
        setSounds(Array.isArray(d.sounds) ? d.sounds : [])
        setDefaultSound(d.defaultSound ?? null)
      })
      .catch((e) => setError(String(e.message ?? e)))
      .finally(() => setLoading(false))
  }, [open, range])

  useEffect(() => () => audio.current?.pause(), [])

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? sounds.filter((s) => `${s.name} ${s.artist ?? ""}`.toLowerCase().includes(q)) : sounds
  }, [sounds, search])

  const togglePreview = (s: Sound) => {
    if (!s.previewUrl) return
    if (playing === s.musicSoundId) {
      audio.current?.pause()
      setPlaying(null)
      return
    }
    audio.current?.pause()
    audio.current = new Audio(s.previewUrl)
    audio.current.onended = () => setPlaying(null)
    audio.current.play().catch(() => setPlaying(null))
    setPlaying(s.musicSoundId)
  }

  const makeDefault = async (s: Sound | null) => {
    setSavingDefault(s?.musicSoundId ?? "clear")
    try {
      const pick = s ? { musicSoundId: s.musicSoundId, name: s.name, artist: s.artist ?? null } : null
      const r = await fetch("/api/admin/tiktok/default-sound", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sound: pick }),
      })
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`)
      setDefaultSound(pick)
    } catch (e) {
      setError(`Couldn't save the default: ${String((e as Error).message ?? e)}`)
    } finally {
      setSavingDefault(null)
    }
  }

  if (handFinished) {
    return (
      <div className="rounded-lg border border-gray-300 bg-gray-50/60 p-4">
        <div className="font-medium text-gray-900">TikTok sound</div>
        <div className="text-xs text-gray-600 mt-0.5">
          When this article is published, its TikTok carousel comes to your phone ready to post. Add any sound in
          the TikTok app before you tap Post.
        </div>
      </div>
    )
  }

  const effective = value
    ? `This article: ${label(value)}`
    : defaultSound
      ? `Default sound: ${label(defaultSound)}`
      : "No sound picked — TikTok will choose music"

  return (
    <div className="rounded-lg border border-gray-300 bg-gray-50/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-medium text-gray-900">TikTok sound</div>
          <div className="text-xs text-gray-600 mt-0.5">{effective}</div>
        </div>
        <div className="flex gap-2">
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              Use default
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
            {open ? "Close" : "Pick a sound"}
          </Button>
        </div>
      </div>

      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-gray-500">
            Trending sounds from TikTok&apos;s Commercial Music Library, cleared for business use. Crime and
            tragedy stories aren&apos;t posted to TikTok, so their pick is ignored.
          </p>
          <div className="flex flex-wrap gap-2 items-center">
            {RANGES.map((r) => (
              <Button
                key={r.value}
                type="button"
                size="sm"
                variant={range === r.value ? "default" : "outline"}
                onClick={() => setRange(r.value)}
              >
                {r.label}
              </Button>
            ))}
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search song or artist"
              className="h-8 max-w-56"
            />
          </div>

          {error && <p className="text-sm text-red-700">{error}</p>}
          {loading && <p className="text-sm text-gray-500">Loading sounds…</p>}

          <div className="max-h-96 overflow-y-auto divide-y rounded-md border bg-white">
            {shown.map((s) => {
              const chosen = value?.musicSoundId === s.musicSoundId
              const isDefault = defaultSound?.musicSoundId === s.musicSoundId
              return (
                <div key={s.musicSoundId} className={`flex items-center gap-3 p-2 ${chosen ? "bg-orange-50" : ""}`}>
                  {s.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.thumbnailUrl} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-gray-200 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {s.rankPosition ? <span className="text-gray-400 mr-1">#{s.rankPosition}</span> : null}
                      {s.name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {s.artist}
                      {s.duration ? ` · ${s.duration}s` : ""}
                      {isDefault ? " · default" : ""}
                    </div>
                  </div>
                  {s.previewUrl && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => togglePreview(s)}>
                      {playing === s.musicSoundId ? "■ Stop" : "▶ Play"}
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant={chosen ? "default" : "outline"}
                    onClick={() => onChange(chosen ? null : { musicSoundId: s.musicSoundId, name: s.name, artist: s.artist ?? null })}
                  >
                    {chosen ? "Chosen" : "Use"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={savingDefault !== null}
                    onClick={() => makeDefault(isDefault ? null : s)}
                    title={isDefault ? "Stop using this as the default" : "Use this for every article without its own pick"}
                  >
                    {savingDefault === s.musicSoundId ? "…" : isDefault ? "Unset default" : "Set default"}
                  </Button>
                </div>
              )
            })}
            {!loading && shown.length === 0 && !error && (
              <p className="p-3 text-sm text-gray-500">No sounds found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
