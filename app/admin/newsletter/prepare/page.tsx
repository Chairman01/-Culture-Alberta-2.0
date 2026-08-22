"use client"

/**
 * Preparing an edition — the writer's half of the newsletter.
 *
 * Deliberately a separate page from /admin/newsletter rather than a trimmed
 * version of it. That page is built around the subscriber list: ~1,200 real
 * email addresses, engagement per person, and the send buttons. A writer needs
 * none of that to choose stories, and hiding sections of a page is not a
 * boundary — the data still arrives in the browser and the actions are still
 * callable. So writers get their own page that never loads either.
 *
 * Admins can open this too; it is the fastest way to see what was handed over.
 */

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
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
  savePreparedEdition,
  searchArticles,
  getArticleDetails,
  loadLatestCityArticles,
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

export default function PrepareNewsletterPage() {
  const [city, setCity] = useState<NewsletterCity>("edmonton")
  const [configs, setConfigs] = useState<Record<string, NewsletterConfig> | null>(null)
  const [picks, setPicks] = useState<ArticlePickerItem[]>([])
  const [subject, setSubject] = useState("")
  const [note, setNote] = useState("")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ArticlePickerItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const { toast } = useToast()

  // Load every edition's saved state once, then switch between them locally.
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
    async (target: NewsletterCity) => {
      if (!configs) return
      setIsLoading(true)
      try {
        const config = configs[target]
        setSubject(config?.proposed_subject || "")
        setNote(config?.prepare_note || "")
        setSavedAt(config?.prepared_at || null)

        // Saved picks if there are any; otherwise what the edition would send
        // as it stands, which is the useful starting point rather than a blank.
        const ids = config?.article_order
        setPicks(ids?.length ? await getArticleDetails(ids) : await loadLatestCityArticles(target))
      } catch {
        setPicks([])
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

  const addPick = (article: ArticlePickerItem) => {
    setPicks(prev => (prev.some(p => p.id === article.id) ? prev : [...prev, article]))
  }

  const move = (index: number, direction: -1 | 1) => {
    setPicks(prev => {
      const next = [...prev]
      const target = index + direction
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const save = async () => {
    setIsSaving(true)
    try {
      const orderResult = await saveArticleOrder(city, picks.map(p => p.id))
      if (orderResult.error) throw new Error(orderResult.error)

      const prepResult = await savePreparedEdition(city, { proposedSubject: subject, note })
      if (prepResult.error) throw new Error(prepResult.error)

      const now = new Date().toISOString()
      setSavedAt(now)
      setConfigs(prev =>
        prev
          ? {
              ...prev,
              [city]: {
                ...prev[city],
                article_order: picks.map(p => p.id),
                proposed_subject: subject,
                prepare_note: note,
                prepared_at: now,
              },
            }
          : prev,
      )
      toast({
        title: "Handed over",
        description: "Adam sees your picks, subject line and note. Nothing has been emailed.",
      })
    } catch (error) {
      toast({
        title: "Could not save",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const current = EDITIONS.find(e => e.city === city)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="h-6 w-6" /> Prepare a newsletter
        </h1>
        <p className="text-gray-600 mt-1">
          Choose the stories, order them, and write a subject line. Adam reviews and sends.
        </p>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 flex gap-2">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          Saving here never emails anyone. Lead with the strongest story rather than the newest, and
          put an evergreen or benefits piece further down — those keep getting clicked.
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
            <div className="rounded-lg border bg-white p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{current?.label} — running order</h2>
                <Badge variant="secondary">{picks.length} stories</Badge>
              </div>

              {picks.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Nothing picked yet. Search on the right and add the stories for this edition.
                </p>
              ) : (
                <ol className="space-y-2">
                  {picks.map((article, index) => (
                    <li key={article.id} className="rounded-md border p-2.5 flex gap-3 items-start">
                      <span className="text-sm font-semibold text-gray-400 mt-0.5 w-5 shrink-0">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug">{article.title}</p>
                        {index === 0 && (
                          <p className="text-xs text-green-700 mt-0.5">Lead story</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(index, -1)} disabled={index === 0}>
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(index, 1)} disabled={index === picks.length - 1}>
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setPicks(prev => prev.filter(p => p.id !== article.id))}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>

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
              <div className="flex items-center gap-3">
                <Button onClick={save} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Hand over
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
          <div className="rounded-lg border bg-white p-4 space-y-4">
            <h2 className="font-semibold">Add a story</h2>
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
                  const alreadyIn = picks.some(p => p.id === article.id)
                  return (
                    <li key={article.id} className="rounded-md border p-2.5 flex gap-3 items-start">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug">{article.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(article.created_at).toLocaleDateString("en-CA")}
                          {article.location ? ` · ${article.location}` : ""}
                        </p>
                      </div>
                      <Button
                        variant={alreadyIn ? "ghost" : "outline"}
                        size="sm"
                        className="shrink-0"
                        disabled={alreadyIn}
                        onClick={() => addPick(article)}
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
        Checked every link? A dead one goes to everyone at once. See the{" "}
        <Link href="/admin/articles" className="underline underline-offset-2">
          articles list
        </Link>{" "}
        for what has published since the last send.
      </p>
    </div>
  )
}
