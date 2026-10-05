"use client"

/**
 * Send one article to every subscriber, right now. For AMBER Alerts and other
 * urgent public-safety stories that can't wait for the next edition.
 *
 * The flow forces the order a careful person would follow anyway: load the
 * article, look at the email, send yourself a test, then type the recipient
 * count to send for real.
 */

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowLeft, Loader2, Mail, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  prepareAlert,
  previewAlert,
  sendAlertTestEmail,
  sendAlertEmailToEveryone,
  type AlertPreparation,
} from "./_actions"
import type { AlertKind, AlertSendResult } from "@/lib/newsletter/alert"

const PRESETS: { label: string; kind: AlertKind; note: string }[] = [
  { label: "AMBER Alert", kind: "alert", note: "If you see them, don't approach. Call 911." },
  { label: "Emergency Alert", kind: "alert", note: "" },
  { label: "Public Safety Alert", kind: "alert", note: "" },
  { label: "AMBER Alert cancelled", kind: "update", note: "" },
  { label: "Update", kind: "update", note: "" },
]

export default function AlertSender() {
  const [articleInput, setArticleInput] = useState("")
  const [prep, setPrep] = useState<AlertPreparation | null>(null)
  const [label, setLabel] = useState(PRESETS[0].label)
  const [kind, setKind] = useState<AlertKind>("alert")
  const [note, setNote] = useState(PRESETS[0].note)
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null)
  const [testEmail, setTestEmail] = useState("")
  const [testSent, setTestSent] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [message, setMessage] = useState<{ tone: "error" | "ok"; text: string } | null>(null)
  const [result, setResult] = useState<AlertSendResult | null>(null)
  const [pending, startTransition] = useTransition()

  const input = { kind, label, note }
  const alreadySent = prep?.history.some(h => h.kind === kind) ?? false

  // Keep the preview in step with what would actually be sent.
  useEffect(() => {
    if (!prep) return
    const handle = setTimeout(() => {
      previewAlert(prep.article.slug, input).then(res => {
        if ("error" in res) setMessage({ tone: "error", text: res.error })
        else setPreview(res)
      })
    }, 300)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prep, kind, label, note])

  function load() {
    setMessage(null)
    setResult(null)
    setTestSent(false)
    setConfirmText("")
    startTransition(async () => {
      const res = await prepareAlert(articleInput)
      if ("error" in res) {
        setPrep(null)
        setPreview(null)
        setMessage({ tone: "error", text: res.error })
      } else {
        setPrep(res)
      }
    })
  }

  function applyPreset(index: number) {
    const preset = PRESETS[index]
    setLabel(preset.label)
    setKind(preset.kind)
    setNote(preset.note)
    setConfirmText("")
  }

  function sendTest() {
    if (!prep) return
    setMessage(null)
    startTransition(async () => {
      const res = await sendAlertTestEmail(prep.article.slug, input, testEmail)
      if (res.sent === 1) {
        setTestSent(true)
        setMessage({ tone: "ok", text: `Test sent to ${testEmail}. Check it on your phone before sending to everyone.` })
      } else {
        setMessage({ tone: "error", text: res.errors.join(" ") || "Test failed." })
      }
    })
  }

  function sendForReal() {
    if (!prep) return
    setMessage(null)
    startTransition(async () => {
      const res = await sendAlertEmailToEveryone(prep.article.id, input, Number(confirmText))
      setResult(res)
      if (res.sent > 0) {
        setMessage({ tone: "ok", text: `Sent to ${res.sent} subscribers${res.failed ? `, ${res.failed} failed` : ""}.` })
        const refreshed = await prepareAlert(prep.article.slug)
        if (!("error" in refreshed)) setPrep(refreshed)
        setConfirmText("")
      } else {
        setMessage({ tone: "error", text: res.errors.join(" ") || "Nothing was sent." })
      }
    })
  }

  const canSend =
    !!prep && !alreadySent && label.trim().length > 0 && confirmText.trim() === String(prep.recipientCount)

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Link href="/admin/newsletter" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Newsletter
      </Link>
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <AlertTriangle className="h-6 w-6 text-red-600" /> Send an alert email
      </h1>
      <p className="text-muted-foreground mt-1 mb-6 max-w-2xl">
        Emails one published article to every newsletter subscriber, across all cities. Use it for AMBER Alerts
        and urgent public-safety stories only. Each article can send one alert and one follow-up update.
      </p>

      <div className="flex gap-2 mb-6 max-w-3xl">
        <Input
          placeholder="Paste the article link or slug"
          value={articleInput}
          onChange={e => setArticleInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && articleInput.trim()) load() }}
        />
        <Button onClick={load} disabled={pending || !articleInput.trim()}>
          {pending && !prep ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load"}
        </Button>
      </div>

      {message && (
        <div className={`mb-6 max-w-3xl rounded-md border p-3 text-sm ${message.tone === "error" ? "border-red-200 bg-red-50 text-red-900" : "border-green-200 bg-green-50 text-green-900"}`}>
          {message.text}
        </div>
      )}

      {prep && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <div className="rounded-lg border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Article</p>
              <p className="font-semibold mt-1">{prep.article.title}</p>
              <a href={prep.article.url} target="_blank" rel="noreferrer" className="text-sm text-blue-700 underline break-all">
                {prep.article.url}
              </a>
              {prep.history.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm">
                  {prep.history.map(h => (
                    <li key={h.kind} className="text-muted-foreground">
                      Already sent <strong>{h.label}</strong> ({h.kind}) to {h.sent} people on{" "}
                      {new Date(h.created_at).toLocaleString("en-CA", { timeZone: "America/Edmonton" })}
                      {h.status === "sending" && " — still marked sending; check Resend before doing anything"}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((preset, i) => (
                  <Button
                    key={preset.label}
                    type="button"
                    size="sm"
                    variant={label === preset.label ? "default" : "outline"}
                    onClick={() => applyPreset(i)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alert-label">Banner text</Label>
              <Input id="alert-label" value={label} onChange={e => { setLabel(e.target.value); setConfirmText("") }} />
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" checked={kind === "alert"} onChange={() => { setKind("alert"); setConfirmText("") }} />
                  First alert (red)
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" checked={kind === "update"} onChange={() => { setKind("update"); setConfirmText("") }} />
                  Follow-up update (grey)
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alert-note">Highlighted line (optional)</Label>
              <Textarea id="alert-note" rows={2} value={note} onChange={e => setNote(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                The email shows the article&apos;s image, title and excerpt, then this line and a button to the article.
                Keep the details in the article, where you can update them.
              </p>
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <p className="font-medium flex items-center gap-2"><Mail className="h-4 w-4" /> 1. Send yourself a test</p>
              <div className="flex gap-2">
                <Input type="email" placeholder="you@example.com" value={testEmail} onChange={e => setTestEmail(e.target.value)} />
                <Button variant="outline" onClick={sendTest} disabled={pending || !testEmail.trim()}>
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send test"}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border-2 border-red-300 bg-red-50/50 p-4 space-y-3">
              <p className="font-medium flex items-center gap-2 text-red-900"><Send className="h-4 w-4" /> 2. Send to everyone</p>
              {alreadySent ? (
                <p className="text-sm text-red-900">
                  This article&apos;s {kind === "alert" ? "first alert" : "follow-up update"} has already gone out.
                  {kind === "alert" && " To tell people it's over, choose \"AMBER Alert cancelled\" and send the follow-up."}
                </p>
              ) : (
                <>
                  <p className="text-sm text-red-900">
                    This goes to <strong>{prep.recipientCount.toLocaleString()}</strong> subscribers immediately and can&apos;t be undone.
                    {" "}Check the alert is still active first. Type <strong>{prep.recipientCount}</strong> to confirm.
                  </p>
                  {!testSent && (
                    <p className="text-xs text-red-800">You haven&apos;t sent a test from this page yet.</p>
                  )}
                  <div className="flex gap-2">
                    <Input
                      inputMode="numeric"
                      placeholder={String(prep.recipientCount)}
                      value={confirmText}
                      onChange={e => setConfirmText(e.target.value)}
                    />
                    <Button variant="destructive" onClick={sendForReal} disabled={pending || !canSend}>
                      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : `Send to ${prep.recipientCount}`}
                    </Button>
                  </div>
                </>
              )}
              {result && result.errors.length > 0 && result.sent > 0 && (
                <ul className="text-xs text-red-900 list-disc pl-4">
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Subject</p>
            <p className="font-medium mb-3">{preview?.subject ?? "…"}</p>
            <div className="rounded-lg border overflow-hidden bg-[#e8e8e8]">
              {preview ? (
                <iframe title="Alert email preview" srcDoc={preview.html} className="w-full h-[900px] bg-white" sandbox="allow-popups allow-popups-to-escape-sandbox" />
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
