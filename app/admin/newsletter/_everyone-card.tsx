"use client"

/**
 * The "Everyone" card in Send Newsletter Now: one email, sent once to every
 * subscriber across all editions.
 *
 * Two types:
 * - AMBER Alert: the red urgent email (lib/newsletter/alert.ts, kind 'alert')
 * - Regular: the daily edition's look (kind 'story')
 *
 * The first article is the main story; up to MAX_MORE more can be listed
 * under it. Preview builds the email exactly as it would send.
 *
 * Every send needs the recipient count typed back, and each main article can
 * go to everyone once per type (enforced in the database, not here). The
 * follow-up for an alert that has ended lives on /admin/newsletter/alert.
 */

import { useEffect, useRef, useState, useTransition } from "react"
import Link from "next/link"
import {
  AlertCircle, ArrowUp, CheckCircle, Eye, FlaskConical, Loader2, Newspaper, Plus, Search, Send, Siren, X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  getEveryoneCount,
  prepareAlert,
  previewAlert,
  findAlertArticle,
  searchEveryoneArticles,
  sendAlertTestEmail,
  sendAlertEmailToEveryone,
  type AlertPreparation,
} from "./alert/_actions"
import { MAX_MORE } from "@/lib/newsletter/alert-shared"
import type { AlertArticle, AlertKind } from "@/lib/newsletter/alert"

type EveryoneType = Extract<AlertKind, "alert" | "story">

const TYPES: Record<EveryoneType, { label: string; banner: string; note: string; button: string }> = {
  alert: {
    label: "AMBER Alert",
    banner: "AMBER Alert",
    note: "If you see them, don't approach. Call 911.",
    button: "bg-red-700 hover:bg-red-800",
  },
  story: {
    label: "Regular",
    banner: "Culture Alberta",
    note: "",
    button: "bg-gray-900 hover:bg-black",
  },
}

type SearchHit = Awaited<ReturnType<typeof searchEveryoneArticles>>[number]

const looksLikeLink = (s: string) => /^https?:\/\//i.test(s.trim()) || s.trim().startsWith("/articles/")

export default function EveryoneSendCard() {
  const [type, setType] = useState<EveryoneType>("alert")
  const [count, setCount] = useState<number | null>(null)
  const [prep, setPrep] = useState<AlertPreparation | null>(null)
  const [more, setMore] = useState<AlertArticle[]>([])
  const [note, setNote] = useState(TYPES.alert.note)

  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<SearchHit[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const searchBox = useRef<HTMLDivElement>(null)

  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const [testOpen, setTestOpen] = useState(false)
  const [testEmail, setTestEmail] = useState("")
  const [confirming, setConfirming] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [message, setMessage] = useState<{ tone: "error" | "ok"; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    getEveryoneCount().then(setCount).catch(() => setCount(null))
  }, [])

  const moreIds = more.map(a => a.id)
  const input = { kind: type, label: TYPES[type].banner, note, moreArticleIds: moreIds }
  const alreadySent = prep?.history.some(h => h.kind === type) ?? false
  const isAlert = type === "alert"

  // Search as you type. An empty box lists the newest articles.
  useEffect(() => {
    if (!searchOpen || looksLikeLink(query)) return
    setSearching(true)
    const handle = setTimeout(() => {
      searchEveryoneArticles(query)
        .then(setHits)
        .finally(() => setSearching(false))
    }, 250)
    return () => clearTimeout(handle)
  }, [query, searchOpen])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (searchBox.current && !searchBox.current.contains(e.target as Node)) setSearchOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  function resetConfirm() {
    setConfirming(false)
    setConfirmText("")
  }

  function chooseType(next: EveryoneType) {
    setType(next)
    setNote(TYPES[next].note)
    resetConfirm()
    setMessage(null)
  }

  /** First article becomes the main story; the rest go under it. */
  function addArticle(linkOrId: string) {
    if (!linkOrId.trim()) return
    setMessage(null)
    setSearchOpen(false)
    setQuery("")
    resetConfirm()
    startTransition(async () => {
      if (!prep) {
        const res = await prepareAlert(linkOrId)
        if ("error" in res) setMessage({ tone: "error", text: res.error })
        else { setPrep(res); setCount(res.recipientCount) }
        return
      }
      if (more.length >= MAX_MORE) {
        setMessage({ tone: "error", text: `You can add up to ${MAX_MORE} more stories.` })
        return
      }
      const res = await findAlertArticle(linkOrId)
      if ("error" in res) { setMessage({ tone: "error", text: res.error }); return }
      if (res.id === prep.article.id || more.some(a => a.id === res.id)) {
        setMessage({ tone: "error", text: "That article is already in this email." })
        return
      }
      setMore(prev => [...prev, res])
    })
  }

  function removeMain() {
    resetConfirm()
    if (more.length === 0) { setPrep(null); return }
    const [next, ...rest] = more
    setMore(rest)
    startTransition(async () => {
      const res = await prepareAlert(next.id)
      if (!("error" in res)) setPrep(res)
    })
  }

  function makeMain(article: AlertArticle) {
    if (!prep) return
    resetConfirm()
    const oldMain = prep.article
    setMore(prev => [oldMain, ...prev.filter(a => a.id !== article.id)])
    startTransition(async () => {
      const res = await prepareAlert(article.id)
      if (!("error" in res)) setPrep(res)
    })
  }

  /** Builds the email exactly as it would send, then shows it in a popup. */
  function openPreview() {
    if (!prep) return
    setPreviewLoading(true)
    previewAlert(prep.article.id, input)
      .then(res => {
        if ("error" in res) setMessage({ tone: "error", text: res.error })
        else setPreview(res)
      })
      .finally(() => setPreviewLoading(false))
  }

  function sendTest() {
    if (!prep) return
    setMessage(null)
    startTransition(async () => {
      const res = await sendAlertTestEmail(prep.article.id, input, testEmail)
      setMessage(res.sent === 1
        ? { tone: "ok", text: `Test sent to ${testEmail}.` }
        : { tone: "error", text: res.errors.join(" ") || "Test failed." })
    })
  }

  function send() {
    if (!prep) return
    setMessage(null)
    startTransition(async () => {
      const res = await sendAlertEmailToEveryone(prep.article.id, input, Number(confirmText))
      if (res.sent > 0) {
        setMessage({ tone: "ok", text: `Sent to ${res.sent} subscribers${res.failed ? `, ${res.failed} failed` : ""}.` })
        resetConfirm()
        const refreshed = await prepareAlert(prep.article.id)
        if (!("error" in refreshed)) setPrep(refreshed)
      } else {
        setMessage({ tone: "error", text: res.errors.join(" ") || "Nothing was sent." })
      }
    })
  }

  return (
    <div className={`border-2 rounded-xl p-5 mb-6 ${isAlert ? "border-red-200 bg-red-50/30" : "border-gray-200 bg-white"}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <div className={`text-sm font-bold uppercase tracking-wide ${isAlert ? "text-red-700" : "text-gray-900"}`}>Everyone</div>
          <div className="text-lg font-semibold text-gray-900">All subscribers, every city</div>
          <div className="text-sm text-muted-foreground">
            {count === null ? "…" : count.toLocaleString()} active subscribers · sent once
          </div>
        </div>
        <div className="inline-flex rounded-lg border bg-white p-1">
          {(Object.keys(TYPES) as EveryoneType[]).map(t => (
            <button
              key={t}
              onClick={() => chooseType(t)}
              className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                type === t
                  ? t === "alert" ? "bg-red-700 text-white" : "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {t === "alert" ? <Siren className="h-4 w-4" /> : <Newspaper className="h-4 w-4" />}
              {TYPES[t].label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 max-w-3xl">
          {/* Article list */}
          <div className="space-y-2">
            {prep && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Main story</p>
                <ArticleRow article={prep.article} big onRemove={removeMain} />
                {prep.history.map(h => (
                  <p key={h.kind} className="text-xs text-amber-700">
                    Already sent to everyone as {h.kind === "alert" ? "an AMBER Alert" : h.kind === "story" ? "a regular email" : "an update"} ({h.sent} people)
                  </p>
                ))}
              </>
            )}
            {more.length > 0 && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 pt-2">More stories</p>
                {more.map(a => (
                  <ArticleRow
                    key={a.id}
                    article={a}
                    onRemove={() => { resetConfirm(); setMore(prev => prev.filter(x => x.id !== a.id)) }}
                    onMakeMain={() => makeMain(a)}
                  />
                ))}
              </>
            )}
          </div>

          {/* Search / paste */}
          {(!prep || more.length < MAX_MORE) && (
            <div ref={searchBox} className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={prep ? "Add another story: search or paste a link" : "Search articles or paste the article link"}
                    value={query}
                    onChange={e => { setQuery(e.target.value); setSearchOpen(true) }}
                    onFocus={() => setSearchOpen(true)}
                    onKeyDown={e => { if (e.key === "Enter" && looksLikeLink(query)) addArticle(query) }}
                    className="bg-white pl-9"
                  />
                </div>
                {looksLikeLink(query) && (
                  <Button variant="outline" onClick={() => addArticle(query)} disabled={pending} className="shrink-0 bg-white">
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-1 h-4 w-4" /> Add</>}
                  </Button>
                )}
              </div>
              {searchOpen && !looksLikeLink(query) && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border bg-white shadow-lg max-h-80 overflow-y-auto">
                  {searching && hits.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Searching…</div>
                  ) : hits.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">No articles match.</div>
                  ) : (
                    hits.map(hit => {
                      const used = hit.id === prep?.article.id || more.some(a => a.id === hit.id)
                      return (
                        <button
                          key={hit.id}
                          disabled={used || pending}
                          onClick={() => addArticle(hit.id)}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 disabled:opacity-40"
                        >
                          {hit.imageUrl
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={hit.imageUrl} alt="" className="h-10 w-14 object-cover rounded shrink-0" />
                            : <div className="h-10 w-14 rounded bg-gray-100 shrink-0" />}
                          <span className="min-w-0">
                            <span className="block text-sm text-gray-900 line-clamp-2">{hit.title}</span>
                            <span className="block text-xs text-muted-foreground">
                              {new Date(hit.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                              {used && " · already added"}
                            </span>
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {prep && (
            <>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Highlighted line <span className="font-normal text-muted-foreground">(optional, bold under the main story)</span>
                </label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={2}
                  placeholder={isAlert ? "Pictured: … If you see them, call 911." : "e.g. Opens Saturday at 10 a.m."}
                  className="w-full text-sm rounded-md border border-gray-200 bg-white px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-gray-300"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={openPreview} disabled={previewLoading} className="bg-white">
                  {previewLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />} Preview
                </Button>
                {!confirming ? (
                  <Button
                    className={`${TYPES[type].button} text-white`}
                    onClick={() => setConfirming(true)}
                    disabled={pending || alreadySent}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {alreadySent ? "Already sent" : isAlert ? "Send AMBER Alert to everyone" : "Send to everyone"}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap rounded-lg border border-red-300 bg-white px-3 py-2">
                    <span className="text-sm text-red-900">
                      Goes to <strong>{prep.recipientCount.toLocaleString()}</strong> people now. Type <strong>{prep.recipientCount}</strong>:
                    </span>
                    <Input
                      inputMode="numeric"
                      value={confirmText}
                      onChange={e => setConfirmText(e.target.value)}
                      className="h-8 w-24"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={send}
                      disabled={pending || confirmText.trim() !== String(prep.recipientCount)}
                    >
                      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send now"}
                    </Button>
                    <button onClick={resetConfirm} className="p-1 rounded hover:bg-gray-100">
                      <X className="h-4 w-4 text-gray-400" />
                    </button>
                  </div>
                )}
              </div>

              {isAlert && alreadySent && (
                <p className="text-xs text-muted-foreground">
                  Alert over? <Link href="/admin/newsletter/alert" className="underline">Send the &quot;AMBER Alert cancelled&quot; follow-up</Link>.
                </p>
              )}

              <div>
                {!testOpen ? (
                  <button
                    className="text-xs text-muted-foreground hover:text-gray-700 flex items-center gap-1 underline underline-offset-2"
                    onClick={() => setTestOpen(true)}
                  >
                    <FlaskConical className="h-3 w-3" /> Send test to my email
                  </button>
                ) : (
                  <div className="flex gap-2 max-w-md">
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={testEmail}
                      onChange={e => setTestEmail(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && sendTest()}
                      className="h-8 text-sm bg-white"
                    />
                    <Button size="sm" variant="outline" className="h-8 px-3 shrink-0" onClick={sendTest} disabled={pending || !testEmail.trim()}>
                      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Send"}
                    </Button>
                    <button className="h-8 w-8 flex items-center justify-center rounded hover:bg-gray-100 shrink-0" onClick={() => setTestOpen(false)}>
                      <X className="h-4 w-4 text-gray-400" />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {message && (
            <div className={`flex items-start gap-2 text-sm rounded-lg p-3 ${message.tone === "ok" ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"}`}>
              {message.tone === "ok" ? <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
              {message.text}
            </div>
          )}
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/60" onClick={() => setPreview(null)}>
          <div className="mx-auto mt-8 mb-8 flex w-full max-w-3xl flex-1 flex-col overflow-hidden rounded-xl bg-white" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
              <div className="min-w-0">
                <span className="text-xs text-gray-400">Subject</span>
                <p className="truncate font-semibold text-gray-900">{preview.subject}</p>
              </div>
              <button onClick={() => setPreview(null)} className="p-1 rounded hover:bg-gray-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* allow-popups lets the email's links open the article in a new tab
                instead of loading inside this frame. */}
            <iframe
              title="Everyone email preview"
              srcDoc={preview.html}
              className="w-full flex-1"
              sandbox="allow-popups allow-popups-to-escape-sandbox"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function ArticleRow({
  article,
  big = false,
  onRemove,
  onMakeMain,
}: {
  article: AlertArticle
  big?: boolean
  onRemove: () => void
  onMakeMain?: () => void
}) {
  return (
    <div className="flex gap-3 items-center rounded-lg border bg-white p-2.5">
      {article.imageUrl
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={article.imageUrl} alt="" className={`${big ? "h-16 w-28" : "h-10 w-16"} object-cover rounded shrink-0`} />
        : <div className={`${big ? "h-16 w-28" : "h-10 w-16"} rounded bg-gray-100 shrink-0`} />}
      <a href={article.url} target="_blank" rel="noreferrer" className={`min-w-0 flex-1 hover:underline ${big ? "font-medium" : ""} text-sm text-gray-900 line-clamp-2`}>
        {article.title}
      </a>
      {onMakeMain && (
        <button onClick={onMakeMain} title="Make this the main story" className="p-1.5 rounded hover:bg-gray-100 shrink-0">
          <ArrowUp className="h-4 w-4 text-gray-500" />
        </button>
      )}
      <button onClick={onRemove} title="Remove" className="p-1.5 rounded hover:bg-gray-100 shrink-0">
        <X className="h-4 w-4 text-gray-400" />
      </button>
    </div>
  )
}
