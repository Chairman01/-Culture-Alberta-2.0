"use client"

/**
 * Preparing an edition — the writer's half of the newsletter.
 *
 * Deliberately a separate page from /admin/newsletter rather than a trimmed
 * version of it. That page is built around the subscriber list: ~1,700 real
 * email addresses, engagement per person, and the send buttons. A writer needs
 * none of that to choose stories, and hiding sections of a page is not a
 * boundary — the data still arrives in the browser and the actions are still
 * callable. So writers get their own page that never loads either.
 *
 * Admins can open this too; it is the fastest way to see what was handed over.
 */

import { useState, useEffect, useCallback } from "react"
import {
  Loader2,
  Mail,
  Search,
  Plus,
  X,
  ArrowUp,
  ArrowDown,
  Save,
  Check,
  Info,
  Eye,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
  loadAllConfigs,
  saveArticleOrder,
  saveFeaturedArticle,
  saveAlbertaArticles,
  savePreparedEdition,
  searchArticles,
  getArticleDetails,
  loadLatestCityArticles,
  loadLatestAlbertaArticles,
  type ArticlePickerItem,
  type NewsletterConfig,
} from "../_config-actions"
import type { NewsletterCity } from "@/lib/newsletter/config"

/** Cadence comes from the handbook: the two big cities daily, the rest weekly. */
const EDITIONS: { city: NewsletterCity; label: string; cadence: string }[] = [
  { city: "edmonton", label: "Edmonton", cadence: "Daily" },
  { city: "calgary", label: "Calgary", cadence: "Daily" },
  { city: "lethbridge", label: "Lethbridge", cadence: "Weekly" },
  { city: "medicine-hat", label: "Medicine Hat", cadence: "Weekly" },
  { city: "grande-prairie", label: "Grande Prairie", cadence: "Weekly" },
  { city: "red-deer", label: "Red Deer", cadence: "Weekly" },
  { city: "fort-mcmurray", label: "Fort McMurray", cadence: "Weekly" },
]

/** Which list a searched story gets added to. */
type Target = "city" | "alberta"

export default function PrepareNewsletterPage() {
  const [city, setCity] = useState<NewsletterCity>("edmonton")
  const [configs, setConfigs] = useState<Record<string, NewsletterConfig> | null>(null)
  const [picks, setPicks] = useState<ArticlePickerItem[]>([])
  const [alberta, setAlberta] = useState<ArticlePickerItem[]>([])
  const [subject, setSubject] = useState("")
  const [note, setNote] = useState("")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ArticlePickerItem[]>([])
  const [target, setTarget] = useState<Target>("city")
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadAllConfigs()
      .then(setConfigs)
      .catch(() =>
        toast({
          title: "Could not load the editions",
          description: "Reload the page — if it keeps happening, tell Adam.",
          variant: "destructive",
        }),
      )
      .finally(() => setIsLoading(false))
  }, [toast])

  const loadEdition = useCallback(
    async (targetCity: NewsletterCity) => {
      if (!configs) return
      setIsLoading(true)
      try {
        const config = configs[targetCity]
        setSubject(config?.proposed_subject || "")
        setNote(config?.prepare_note || "")
        setSavedAt(config?.prepared_at || null)

        // Saved picks if there are any; otherwise what the edition would send as
        // it stands, which is a more useful starting point than a blank list.
        const cityIds = config?.article_order
        const albertaIds = config?.alberta_article_ids

        const [cityItems, albertaItems] = await Promise.all([
          cityIds?.length ? getArticleDetails(cityIds) : loadLatestCityArticles(targetCity),
          albertaIds?.length ? getArticleDetails(albertaIds) : loadLatestAlbertaArticles(),
        ])
        setPicks(cityItems)
        setAlberta(albertaItems)
      } catch {
        setPicks([])
        setAlberta([])
      } finally {
        setIsLoading(false)
      }
    },
    [configs],
  )

  useEffect(() => {
    if (configs) loadEdition(city)
  }, [configs, city, loadEdition])

  const runSearch = async () => {
    setIsSearching(true)
    try {
      setResults(await searchArticles(query))
    } catch {
      toast({ title: "Search failed", variant: "destructive" })
    } finally {
      setIsSearching(false)
    }
  }

  const addTo = (article: ArticlePickerItem) => {
    const setter = target === "city" ? setPicks : setAlberta
    setter(prev => (prev.some(p => p.id === article.id) ? prev : [...prev, article]))
  }

  const move = (list: Target, index: number, direction: -1 | 1) => {
    const setter = list === "city" ? setPicks : setAlberta
    setter(prev => {
      const next = [...prev]
      const swap = index + direction
      if (swap < 0 || swap >= next.length) return prev
      ;[next[index], next[swap]] = [next[swap], next[index]]
      return next
    })
  }

  const removeFrom = (list: Target, id: string) => {
    const setter = list === "city" ? setPicks : setAlberta
    setter(prev => prev.filter(p => p.id !== id))
  }

  /**
   * Writes the edition. Returns whether it worked, so preview can save first.
   *
   * `quiet` suppresses the confirmation toast when this runs as a step inside
   * previewing rather than as the writer deliberately handing over.
   */
  const persist = async (quiet = false): Promise<boolean> => {
    setIsSaving(true)
    try {
      const order = await saveArticleOrder(city, picks.map(p => p.id))
      if (order.error) throw new Error(order.error)

      // The list is the running order, so the story at the top is the lead.
      // A separate pinned "featured" article overrides article_order in
      // fetch-articles — it is forced to the front, and prepended if it is not
      // even in the list — so leaving it unmanaged meant the email could lead
      // with something the writer had removed. Pinning the first pick keeps the
      // list and the email saying the same thing.
      const featured = await saveFeaturedArticle(city, picks[0]?.id ?? null)
      if (featured.error) throw new Error(featured.error)

      // Alberta picks are shared: saved onto every edition's row, so the same
      // stories appear wherever they are read.
      const shared = await saveAlbertaArticles(alberta.map(a => a.id))
      if (shared.error) throw new Error(shared.error)

      const prep = await savePreparedEdition(city, { proposedSubject: subject, note })
      if (prep.error) throw new Error(prep.error)

      const now = new Date().toISOString()
      setSavedAt(now)
      setConfigs(prev =>
        prev
          ? {
              ...prev,
              [city]: {
                ...prev[city],
                article_order: picks.map(p => p.id),
                alberta_article_ids: alberta.map(a => a.id),
                proposed_subject: subject,
                prepare_note: note,
                prepared_at: now,
              },
            }
          : prev,
      )
      if (!quiet) {
        toast({
          title: "Handed over",
          description: "Adam sees your picks, subject line and note. Nothing has been emailed.",
        })
      }
      return true
    } catch (error) {
      toast({
        title: "Could not save",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const save = () => persist()

  /**
   * Opens the real rendered email in a new tab.
   *
   * Saves first, because the preview is rendered server-side from the stored
   * edition. Without that it happily shows the previous running order while the
   * new one sits unsaved on screen — a preview that disagrees with the page is
   * worse than none, and telling the writer to remember to save first is not a
   * fix. Saving emails nobody, so there is nothing to lose by doing it here.
   */
  const preview = async () => {
    if (!(await persist(true))) return
    const params = new URLSearchParams({ city })
    if (note.trim()) params.set("note", note.trim())
    window.open(`/api/newsletter/preview?${params.toString()}`, "_blank", "noopener")
  }

  const current = EDITIONS.find(e => e.city === city)

  /** One list, rendered the same way for the city stories and the Alberta ones. */
  const StoryList = ({
    list,
    items,
    title,
    subtitle,
    leadLabel,
  }: {
    list: Target
    items: ArticlePickerItem[]
    title: string
    subtitle?: string
    leadLabel?: string
  }) => (
    <div className="rounded-lg border bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <Badge variant={target === list ? "default" : "secondary"} className="shrink-0">
          {items.length} {items.length === 1 ? "story" : "stories"}
        </Badge>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500">
          Nothing picked yet. Choose “{title}” on the right, then search and add.
        </p>
      ) : (
        <ol className="space-y-2">
          {items.map((article, index) => (
            <li key={article.id} className="rounded-md border p-2.5 flex gap-3 items-start">
              <span className="text-sm font-semibold text-gray-400 mt-0.5 w-5 shrink-0">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug">{article.title}</p>
                {index === 0 && leadLabel && (
                  <p className="text-xs text-green-700 mt-0.5">{leadLabel}</p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(list, index, -1)} disabled={index === 0}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(list, index, 1)} disabled={index === items.length - 1}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFrom(list, article.id)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6" /> Prepare a newsletter
          </h1>
          <p className="text-gray-600 mt-1">
            Choose the stories, order them, and write a subject line. Adam reviews and sends.
          </p>
        </div>
        <Button variant="outline" onClick={preview}>
          <Eye className="h-4 w-4 mr-2" />
          Preview email
        </Button>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 flex gap-2">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          Saving here never emails anyone. Lead with the strongest story rather than the newest, and
          put an evergreen or benefits piece further down — those keep getting clicked. Preview saves your picks first, then shows the real email.
        </p>
      </div>

      {/* ── Which edition ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {EDITIONS.map(edition => {
          const prepared = configs?.[edition.city]?.prepared_at
          return (
            <button
              key={edition.city}
              onClick={() => setCity(edition.city)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                city === edition.city
                  ? "border-black bg-black text-white"
                  : "border-gray-300 bg-white hover:bg-gray-50"
              }`}
            >
              {edition.label}
              <span className={city === edition.city ? "text-gray-300" : "text-gray-400"}>
                {" "}· {edition.cadence}
              </span>
              {prepared && city !== edition.city && (
                <Check className="inline h-3.5 w-3.5 ml-1.5 text-green-600" />
              )}
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-gray-500 py-12">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading {current?.label}…
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* ── The edition ────────────────────────────────────────────── */}
          <div className="space-y-4">
            <StoryList
              list="city"
              items={picks}
              title={`${current?.label} — running order`}
              leadLabel="Lead story"
            />

            <StoryList
              list="alberta"
              items={alberta}
              title="Across Alberta"
              subtitle="Shared by every edition — changing these changes all of them."
            />

            <div className="rounded-lg border bg-white p-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="subject">Subject line</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Edmonton: what's changing with AISH payments in September"
                  maxLength={140}
                />
                <p className="text-xs text-gray-500">
                  Be specific. “Your Edmonton update” gets ignored; a concrete change gets opened.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="note">Anything Adam should know</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={3}
                  placeholder="Links all checked. Held the storm piece — it'll be stale by send time."
                />
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Button onClick={save} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Hand over
                </Button>
                <Button variant="outline" onClick={preview}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                {savedAt && (
                  <span className="text-sm text-gray-500">
                    Last handed over {new Date(savedAt).toLocaleString("en-CA")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Find stories ───────────────────────────────────────────── */}
          <div className="rounded-lg border bg-white p-4 space-y-4 self-start">
            <div>
              <h2 className="font-semibold">Add a story</h2>
              <p className="text-xs text-gray-500 mt-0.5">Pick which list it goes into first.</p>
            </div>

            {/* Which list the Add buttons below write to. */}
            <div className="flex gap-2">
              {([
                { key: "city" as Target, label: `${current?.label} stories` },
                { key: "alberta" as Target, label: "Across Alberta" },
              ]).map(option => (
                <button
                  key={option.key}
                  onClick={() => setTarget(option.key)}
                  className={`flex-1 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    target === option.key
                      ? "border-black bg-black text-white"
                      : "border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && runSearch()}
                placeholder="Search published articles by title"
              />
              <Button variant="outline" onClick={runSearch} disabled={isSearching}>
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {results.length === 0 ? (
              <p className="text-sm text-gray-500">
                Search a couple of distinctive words from the story. Only published articles can go
                in an edition.
              </p>
            ) : (
              <ul className="space-y-2 max-h-[28rem] overflow-y-auto">
                {results.map(article => {
                  const inCity = picks.some(p => p.id === article.id)
                  const inAlberta = alberta.some(a => a.id === article.id)
                  const alreadyIn = target === "city" ? inCity : inAlberta
                  return (
                    <li key={article.id} className="rounded-md border p-2.5 flex gap-3 items-start">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug">{article.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(article.created_at).toLocaleDateString("en-CA")}
                          {article.location ? ` · ${article.location}` : ""}
                          {inCity && <span className="text-green-700"> · in {current?.label}</span>}
                          {inAlberta && <span className="text-green-700"> · in Across Alberta</span>}
                        </p>
                      </div>
                      <Button
                        variant={alreadyIn ? "ghost" : "outline"}
                        size="sm"
                        className="shrink-0"
                        disabled={alreadyIn}
                        onClick={() => addTo(article)}
                      >
                        {alreadyIn ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      <p className="text-sm text-gray-500">
        Checked every link? A dead one goes to everyone at once.
      </p>
    </div>
  )
}
