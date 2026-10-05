"use client"

/**
 * The "Everyone" card in Send Newsletter Now: one article, emailed once to
 * every subscriber across all editions.
 *
 * Two types:
 * - AMBER Alert: the red urgent email (lib/newsletter/alert.ts, kind 'alert')
 * - Regular: the same card in the daily edition's look (kind 'story')
 *
 * Every send needs the recipient count typed back, and each article can go to
 * everyone once per type (enforced in the database, not here). The follow-up
 * for an alert that has ended lives on /admin/newsletter/alert.
 */

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { AlertCircle, CheckCircle, Eye, FlaskConical, Loader2, Send, Siren, Newspaper, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  getEveryoneCount,
  prepareAlert,
  previewAlert,
  sendAlertTestEmail,
  sendAlertEmailToEveryone,
  type AlertPreparation,
} from "./alert/_actions"
import type { AlertKind } from "@/lib/newsletter/alert"

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

export default function EveryoneSendCard() {
  const [type, setType] = useState<EveryoneType>("alert")
  const [count, setCount] = useState<number | null>(null)
  const [articleInput, setArticleInput] = useState("")
  const [prep, setPrep] = useState<AlertPreparation | null>(null)
  const [note, setNote] = useState(TYPES.alert.note)
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null)
  const [testOpen, setTestOpen] = useState(false)
  const [testEmail, setTestEmail] = useState("")
  const [confirming, setConfirming] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [message, setMessage] = useState<{ tone: "error" | "ok"; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    getEveryoneCount().then(setCount).catch(() => setCount(null))
  }, [])

  const input = { kind: type, label: TYPES[type].banner, note }
  const alreadySent = prep?.history.some(h => h.kind === type) ?? false

  function chooseType(next: EveryoneType) {
    setType(next)
    setNote(TYPES[next].note)
    setConfirming(false)
    setConfirmText("")
    setMessage(null)
  }

  function load() {
    setMessage(null)
    setConfirming(false)
    setConfirmText("")
    startTransition(async () => {
      const res = await prepareAlert(articleInput)
      if ("error" in res) {
        setPrep(null)
        setMessage({ tone: "error", text: res.error })
      } else {
        setPrep(res)
        setCount(res.recipientCount)
      }
    })
  }

  function openPreview() {
    if (!prep) return
    startTransition(async () => {
      const res = await previewAlert(prep.article.slug, input)
      if ("error" in res) setMessage({ tone: "error", text: res.error })
      else setPreview(res)
    })
  }

  function sendTest() {
    if (!prep) return
    setMessage(null)
    startTransition(async () => {
      const res = await sendAlertTestEmail(prep.article.slug, input, testEmail)
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
        setConfirming(false)
        setConfirmText("")
        const refreshed = await prepareAlert(prep.article.slug)
        if (!("error" in refreshed)) setPrep(refreshed)
      } else {
        setMessage({ tone: "error", text: res.errors.join(" ") || "Nothing was sent." })
      }
    })
  }

  const isAlert = type === "alert"

  return (
    <div className={`border-2 rounded-xl p-5 mb-6 space-y-4 ${isAlert ? "border-red-200 bg-red-50/30" : "border-gray-200 bg-white"}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className={`text-sm font-bold uppercase tracking-wide ${isAlert ? "text-red-700" : "text-gray-900"}`}>Everyone</div>
          <div className="text-lg font-semibold text-gray-900">All subscribers, every city</div>
          <div className="text-sm text-muted-foreground">
            {count === null ? "…" : count.toLocaleString()} active subscribers · one article, sent once
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

      <div className="flex gap-2">
        <Input
          placeholder="Paste the article link"
          value={articleInput}
          onChange={e => setArticleInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && articleInput.trim()) load() }}
          className="bg-white"
        />
        <Button variant="outline" onClick={load} disabled={pending || !articleInput.trim()} className="shrink-0">
          {pending && !prep ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load article"}
        </Button>
      </div>

      {prep && (
        <>
          <div className="flex gap-3 items-start rounded-lg border bg-white p-3">
            {prep.article.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={prep.article.imageUrl} alt="" className="h-16 w-28 object-cover rounded shrink-0" />
            )}
            <div className="min-w-0">
              <p className="font-medium text-sm text-gray-900">{prep.article.title}</p>
              {prep.history.map(h => (
                <p key={h.kind} className="text-xs text-amber-700 mt-1">
                  Already sent to everyone as {h.kind === "alert" ? "an AMBER Alert" : h.kind === "story" ? "a regular email" : "an update"} ({h.sent} people)
                </p>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Highlighted line <span className="font-normal text-muted-foreground">(optional, shown in bold under the summary)</span>
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
            <Button variant="outline" onClick={openPreview} disabled={pending} className="bg-white">
              <Eye className="mr-2 h-4 w-4" /> Preview
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
                <button onClick={() => { setConfirming(false); setConfirmText("") }} className="p-1 rounded hover:bg-gray-100">
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
            <iframe title="Everyone email preview" srcDoc={preview.html} className="w-full flex-1" sandbox="" />
          </div>
        </div>
      )}
    </div>
  )
}
