"use client"

/**
 * The pipeline — the three-minute morning job.
 *
 * The approval queue is deliberately first and everything else is below it.
 * The whole point of the system is that the daily decision is "send / skip /
 * snooze" on a handful of drafts, not "read a CRM".
 */

import { useState, useEffect, useCallback } from "react"
import {
  AlertTriangle,
  Check,
  Clipboard,
  Clock,
  ExternalLink,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Reply,
  SkipForward,
  Upload,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

interface Draft {
  id: string
  subject: string
  body: string
  step: number
  sequence_key: string
  status: string
}

interface Lead {
  id: string
  company: string
  contact_name: string | null
  email: string | null
  city: string | null
  tier: string
  stage: string
  sequence_key: string | null
  sequence_step: number
  next_action_on: string | null
  last_reply_at: string | null
  deal_value: number | null
  term_months: number | null
  renewal_on: string | null
  won_at: string | null
  updated_at: string
  consent_basis: string | null
  notes: string | null
  draft: Draft | null
}

/** Whole days from today until `date`. Negative once it has passed. */
function daysUntil(date: string): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 864e5)
}

function daysSince(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 864e5)
}

interface ImportSummary {
  parsed: number
  willImport: number
  needConsent: number
  declined: number
  duplicates: number
  unmappedHeaders: string[]
  rejectedRows: Array<{ line: number; reason: string }>
}

const STAGES = ["new", "contacted", "engaged", "proposal", "won", "lost", "declined"] as const

const STAGE_STYLE: Record<string, string> = {
  new: "bg-gray-100 text-gray-700",
  contacted: "bg-blue-100 text-blue-800",
  engaged: "bg-amber-100 text-amber-900",
  proposal: "bg-violet-100 text-violet-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-gray-100 text-gray-500",
  declined: "bg-red-50 text-red-700",
}

const TIER_LABEL: Record<string, string> = {
  institution: "Institution",
  smb: "Local business",
  no_budget: "No budget",
  decline: "Declined — link seller",
}

export default function LeadsPage() {
  const { toast } = useToast()
  const [leads, setLeads] = useState<Lead[]>([])
  const [setup, setSetup] = useState<{ zoho: string[] | null; mailingAddress: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<string, { subject: string; body: string }>>({})
  const [adding, setAdding] = useState(false)
  const [draftLead, setDraftLead] = useState({ company: "", contact_name: "", email: "", website: "", city: "" })
  const [importing, setImporting] = useState(false)
  const [csv, setCsv] = useState("")
  const [preview, setPreview] = useState<ImportSummary | null>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/leads", { cache: "no-store" })
      if (!response.ok) throw new Error("Failed to load")
      const data = await response.json()
      setLeads(data.leads || [])
      setSetup(data.setup || null)
    } catch {
      toast({ title: "Could not load the pipeline", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const zohoReady = !setup?.zoho
  const queue = leads.filter(lead => lead.draft && lead.draft.status === "pending")
  const replied = leads.filter(lead => lead.last_reply_at && !["won", "lost", "declined"].includes(lead.stage))
  const won = leads.filter(lead => lead.stage === "won")
  const bookedValue = won.reduce((total, lead) => total + Number(lead.deal_value || 0), 0)

  // In play, on nobody's schedule, untouched for a fortnight. These are the
  // deals that die without anyone deciding to kill them, so they get counted.
  const quiet = leads.filter(
    lead =>
      ["contacted", "engaged", "proposal"].includes(lead.stage) &&
      !lead.next_action_on &&
      daysSince(lead.updated_at) >= 14,
  )
  // Open opportunities — what is still winnable, as distinct from booked.
  const openValue = leads
    .filter(lead => ["engaged", "proposal"].includes(lead.stage))
    .reduce((total, lead) => total + Number(lead.deal_value || 0), 0)

  const clients = [...won].sort((a, b) => {
    // Soonest renewal first; clients with no term sink to the bottom.
    if (!a.renewal_on) return 1
    if (!b.renewal_on) return -1
    return a.renewal_on.localeCompare(b.renewal_on)
  })

  const tiles = [
    { label: "Reach out today", value: queue.length, tone: queue.length > 0 ? "action" : "calm" },
    { label: "Replied", value: replied.length, tone: replied.length > 0 ? "action" : "calm" },
    { label: "Clients", value: won.length, tone: "calm" },
    { label: "Booked", value: `$${bookedValue.toLocaleString()}`, tone: "good" },
    { label: "In play", value: `$${openValue.toLocaleString()}`, tone: "calm" },
    { label: "Gone quiet", value: quiet.length, tone: quiet.length > 0 ? "warn" : "calm" },
  ]

  async function actionDraft(lead: Lead, action: "approve" | "skip" | "snooze" | "mark_sent") {
    if (!lead.draft) return
    setBusy(lead.draft.id)
    try {
      const edited = edits[lead.draft.id]
      const sends = action === "approve" || action === "mark_sent"
      const response = await fetch("/api/admin/leads/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId: lead.draft.id,
          action,
          ...(sends && edited ? { subject: edited.subject, body: edited.body } : {}),
          ...(action === "snooze" ? { days: 3 } : {}),
        }),
      })
      const result = await response.json()

      if (result.status === "approved_not_sent") {
        toast({ title: "Saved, but not sent", description: result.error, variant: "destructive" })
      } else if (!response.ok || result.ok === false) {
        toast({ title: "That did not go through", description: result.error, variant: "destructive" })
      } else {
        const verb =
          action === "approve" || action === "mark_sent"
            ? "Sent to"
            : action === "skip"
              ? "Skipped"
              : "Snoozed"
        toast({ title: `${verb} ${lead.company}` })
      }
      await load()
    } catch {
      toast({ title: "That did not go through", variant: "destructive" })
    } finally {
      setBusy(null)
    }
  }

  async function patchLead(id: string, changes: Record<string, unknown>) {
    setBusy(id)
    try {
      const response = await fetch("/api/admin/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...changes }),
      })
      if (!response.ok) throw new Error()
      await load()
    } catch {
      toast({ title: "Could not save that change", variant: "destructive" })
    } finally {
      setBusy(null)
    }
  }

  async function createLead() {
    if (!draftLead.company.trim()) return
    setBusy("new")
    try {
      const response = await fetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftLead),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      toast({
        title: `Added ${draftLead.company}`,
        description: result.qualified?.reason,
      })
      setDraftLead({ company: "", contact_name: "", email: "", website: "", city: "" })
      setAdding(false)
      await load()
    } catch (error) {
      toast({
        title: "Could not add that lead",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      })
    } finally {
      setBusy(null)
    }
  }

  /** dryRun first, always: the user sees the summary before anything is written. */
  async function runImport(dryRun: boolean) {
    if (!csv.trim()) return
    setBusy("import")
    try {
      const response = await fetch("/api/admin/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, dryRun }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)

      if (dryRun) {
        setPreview(result.summary)
      } else {
        toast({ title: `Imported ${result.inserted} leads` })
        setCsv("")
        setPreview(null)
        setImporting(false)
        await load()
      }
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      })
    } finally {
      setBusy(null)
    }
  }

  async function readFile(file: File) {
    const text = await file.text()
    setCsv(text)
    setPreview(null)
  }

  async function copyDraft(lead: Lead) {
    const draft = lead.draft
    if (!draft) return
    const edited = edits[draft.id] ?? { subject: draft.subject, body: draft.body }
    try {
      await navigator.clipboard.writeText(`Subject: ${edited.subject}\n\n${edited.body}`)
      toast({ title: "Copied", description: "Paste it into Zoho and send." })
    } catch {
      toast({ title: "Could not copy", description: "Select the text and copy it manually.", variant: "destructive" })
    }
  }

  /**
   * Opens the message in whatever handles mail on this machine. mailto: has a
   * practical URL ceiling around 2000 characters in most browsers, and these
   * bodies plus the CASL footer can approach it — so fall back to the
   * clipboard rather than silently opening a truncated email.
   */
  function openInMailClient(lead: Lead) {
    const draft = lead.draft
    if (!draft || !lead.email) return
    const edited = edits[draft.id] ?? { subject: draft.subject, body: draft.body }
    const url = `mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent(
      edited.subject,
    )}&body=${encodeURIComponent(edited.body)}`

    if (url.length > 1900) {
      copyDraft(lead)
      toast({ title: "Too long for a mail link", description: "Copied to your clipboard instead." })
      return
    }
    window.location.href = url
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading the pipeline…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Partnerships</h1>
          <p className="mt-1 text-sm text-gray-500">
            Who to reach out to, who replied, and who is already paying you.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImporting(value => !value)}>
            <Upload className="mr-1.5 h-4 w-4" /> Import CSV
          </Button>
          <Button size="sm" onClick={() => setAdding(value => !value)}>
            <Plus className="mr-1.5 h-4 w-4" /> Add lead
          </Button>
        </div>
      </div>

      {/* Pipeline at a glance. Semantic tone, not decoration: amber means
          something is rotting, green means money is booked. */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map(tile => (
          <div
            key={tile.label}
            className={`rounded-lg border p-3 ${
              tile.tone === "action"
                ? "border-blue-200 bg-blue-50"
                : tile.tone === "warn"
                  ? "border-amber-200 bg-amber-50"
                  : tile.tone === "good"
                    ? "border-green-200 bg-green-50"
                    : "border-gray-200 bg-white"
            }`}
          >
            <div className="text-2xl font-bold tabular-nums tracking-tight">{tile.value}</div>
            <div className="mt-0.5 text-xs text-gray-600">{tile.label}</div>
          </div>
        ))}
      </div>

      {/* Setup warnings. A half-connected system that fails silently is worse
          than one that says plainly what is missing. */}
      {setup?.zoho && (
        <div className="mb-4 flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <strong>Zoho is not connected</strong> — you are on the manual path. Drafts still generate; send them with
            Open in mail app or Copy, then press Mark as sent. The one thing you lose is automatic reply detection, so
            a lead who answers will keep getting follow-ups until you move them on yourself. Missing:{" "}
            <code className="font-mono text-xs">{setup.zoho.join(", ")}</code>
          </div>
        </div>
      )}
      {setup?.mailingAddress && (
        <div className="mb-4 flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <strong>No mailing address set.</strong> CASL requires one in every commercial email. Set{" "}
            <code className="font-mono text-xs">CRM_MAILING_ADDRESS</code> in Vercel before sending.
          </div>
        </div>
      )}

      {importing && (
        <div className="mb-6 rounded-lg border bg-white p-4">
          <h3 className="mb-1 font-semibold">Import from a spreadsheet</h3>
          <p className="mb-3 text-sm text-gray-500">
            Export your sheet as CSV and drop it here, or paste the rows. The first line must be a header — we match{" "}
            <span className="font-medium">company</span>, <span className="font-medium">contact</span>,{" "}
            <span className="font-medium">email</span>, <span className="font-medium">phone</span>,{" "}
            <span className="font-medium">website</span>, <span className="font-medium">city</span>,{" "}
            <span className="font-medium">category</span> and <span className="font-medium">notes</span> loosely, so
            your existing column names will probably just work.
          </p>

          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            className="mb-3 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-200"
            onChange={event => {
              const file = event.target.files?.[0]
              if (file) readFile(file)
            }}
          />
          <Textarea
            className="mb-3 min-h-[130px] font-mono text-xs"
            placeholder="company,contact,email,city&#10;Pho City,Minh,hello@phocity.ca,Calgary"
            value={csv}
            onChange={event => {
              setCsv(event.target.value)
              setPreview(null)
            }}
          />

          {preview && (
            <div className="mb-3 rounded-md border bg-gray-50 p-3 text-sm">
              <div className="mb-1.5 font-medium">
                {preview.parsed} rows read — {preview.willImport} ready to import
              </div>
              <ul className="space-y-0.5 text-gray-600">
                {preview.needConsent > 0 && (
                  <li>
                    {preview.needConsent} imported but <strong>not scheduled</strong> — no CASL consent basis could be
                    established. Set it per lead and they start moving.
                  </li>
                )}
                {preview.declined > 0 && <li>{preview.declined} routed to the decline lane (link sellers)</li>}
                {preview.duplicates > 0 && <li>{preview.duplicates} skipped — already in the pipeline</li>}
                {preview.rejectedRows.length > 0 && (
                  <li>
                    {preview.rejectedRows.length} row(s) with no company name (line{" "}
                    {preview.rejectedRows.map(row => row.line).join(", ")})
                  </li>
                )}
                {preview.unmappedHeaders.length > 0 && (
                  <li className="text-amber-700">
                    Columns we ignored: {preview.unmappedHeaders.join(", ")}
                  </li>
                )}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={busy === "import" || !csv.trim()} onClick={() => runImport(true)}>
              {busy === "import" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null} Preview
            </Button>
            <Button disabled={busy === "import" || !preview || preview.willImport + preview.needConsent === 0} onClick={() => runImport(false)}>
              Import {preview ? preview.willImport + preview.needConsent : 0} leads
            </Button>
            <Button variant="ghost" onClick={() => { setImporting(false); setPreview(null) }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {adding && (
        <div className="mb-6 grid gap-3 rounded-lg border bg-white p-4 sm:grid-cols-2">
          <Input
            placeholder="Company *"
            value={draftLead.company}
            onChange={event => setDraftLead({ ...draftLead, company: event.target.value })}
          />
          <Input
            placeholder="Contact name"
            value={draftLead.contact_name}
            onChange={event => setDraftLead({ ...draftLead, contact_name: event.target.value })}
          />
          <Input
            placeholder="Email"
            value={draftLead.email}
            onChange={event => setDraftLead({ ...draftLead, email: event.target.value })}
          />
          <Input
            placeholder="Website"
            value={draftLead.website}
            onChange={event => setDraftLead({ ...draftLead, website: event.target.value })}
          />
          <Input
            placeholder="City"
            value={draftLead.city}
            onChange={event => setDraftLead({ ...draftLead, city: event.target.value })}
          />
          <div className="flex gap-2">
            <Button onClick={createLead} disabled={busy === "new" || !draftLead.company.trim()}>
              {busy === "new" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null} Add
            </Button>
            <Button variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* ---- The approval queue ---- */}
      <section className="mb-10">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Reach out today
        </h2>

        {queue.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-gray-50 py-10 text-center text-sm text-gray-500">
            Nothing to approve. The next batch is drafted at 7am.
          </div>
        ) : (
          <div className="space-y-3">
            {queue.map(lead => {
              const draft = lead.draft!
              const edited = edits[draft.id] ?? { subject: draft.subject, body: draft.body }
              return (
                <div key={draft.id} className="rounded-lg border bg-white p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold">{lead.company}</span>
                      <span className="ml-2 text-sm text-gray-500">{lead.email}</span>
                    </div>
                    <Badge variant="secondary" className="font-normal">
                      {draft.sequence_key.replace(/_/g, " ")} · step {draft.step + 1}
                    </Badge>
                  </div>

                  <Input
                    className="mb-2 font-medium"
                    value={edited.subject}
                    onChange={event => setEdits({ ...edits, [draft.id]: { ...edited, subject: event.target.value } })}
                  />
                  <Textarea
                    className="mb-3 min-h-[190px] font-mono text-[13px] leading-relaxed"
                    value={edited.body}
                    onChange={event => setEdits({ ...edits, [draft.id]: { ...edited, body: event.target.value } })}
                  />

                  {/* With Zoho connected, one button does the whole job. Without
                      it, sending happens in the user's own mail client and
                      "Mark as sent" is what advances the cadence. */}
                  <div className="flex flex-wrap gap-2">
                    {zohoReady ? (
                      <Button size="sm" disabled={busy === draft.id} onClick={() => actionDraft(lead, "approve")}>
                        {busy === draft.id ? (
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="mr-1.5 h-4 w-4" />
                        )}
                        Approve &amp; send
                      </Button>
                    ) : (
                      <>
                        <Button size="sm" disabled={busy === draft.id} onClick={() => openInMailClient(lead)}>
                          <ExternalLink className="mr-1.5 h-4 w-4" /> Open in mail app
                        </Button>
                        <Button size="sm" variant="outline" disabled={busy === draft.id} onClick={() => copyDraft(lead)}>
                          <Clipboard className="mr-1.5 h-4 w-4" /> Copy
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy === draft.id}
                          onClick={() => actionDraft(lead, "mark_sent")}
                        >
                          {busy === draft.id ? (
                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="mr-1.5 h-4 w-4" />
                          )}
                          Mark as sent
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" disabled={busy === draft.id} onClick={() => actionDraft(lead, "snooze")}>
                      <Clock className="mr-1.5 h-4 w-4" /> Snooze 3 days
                    </Button>
                    <Button size="sm" variant="ghost" disabled={busy === draft.id} onClick={() => actionDraft(lead, "skip")}>
                      <SkipForward className="mr-1.5 h-4 w-4" /> Skip
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ---- Replied ---- */}
      {replied.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Replied — sequences paused
          </h2>
          <div className="space-y-2">
            {replied.map(lead => (
              <div key={lead.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-3">
                <div className="flex items-center gap-2">
                  <Reply className="h-4 w-4 text-amber-600" />
                  <span className="font-medium">{lead.company}</span>
                  <span className="text-sm text-gray-500">
                    {new Date(lead.last_reply_at!).toLocaleDateString("en-CA")}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => patchLead(lead.id, { stage: "proposal" })}>
                    Proposal sent
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => patchLead(lead.id, { stage: "lost" })}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---- Gone quiet ---- */}
      {quiet.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Gone quiet</h2>
          <p className="mb-3 text-sm text-gray-500">
            In play, nothing scheduled, untouched for a fortnight. Nudge them or close them out.
          </p>
          <div className="space-y-2">
            {quiet.map(lead => (
              <div key={lead.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                <div>
                  <span className="font-medium">{lead.company}</span>
                  <span className="ml-2 text-sm text-gray-500">
                    {lead.stage} · {daysSince(lead.updated_at)} days
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => patchLead(lead.id, { next_action_on: new Date().toISOString().slice(0, 10) })}
                  >
                    Follow up today
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => patchLead(lead.id, { stage: "lost" })}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---- Clients ---- */}
      <section className="mb-10">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Clients ({clients.length})
        </h2>
        <p className="mb-3 text-sm text-gray-500">
          Won deals. A renewal conversation is drafted automatically 45 days before a term ends — that is the step
          that turns a one-off buyer into a retainer.
        </p>

        {clients.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-gray-50 py-8 text-center text-sm text-gray-500">
            No clients yet. Set a lead&rsquo;s stage to <span className="font-medium">won</span> with a deal value and
            term, and it appears here with its renewal booked.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-2.5 font-semibold">Client</th>
                  <th className="px-4 py-2.5 font-semibold">Term</th>
                  <th className="px-4 py-2.5 font-semibold">Renewal</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Value</th>
                </tr>
              </thead>
              <tbody>
                {clients.map(lead => {
                  const days = lead.renewal_on ? daysUntil(lead.renewal_on) : null
                  const urgent = days !== null && days <= 14
                  return (
                    <tr key={lead.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium">{lead.company}</div>
                        <div className="text-xs text-gray-500">{lead.email || "no email"}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {lead.term_months ? `${lead.term_months} months` : <span className="text-gray-400">one-off</span>}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {lead.renewal_on ? (
                          <span className={urgent ? "font-semibold text-amber-700" : "text-gray-600"}>
                            {new Date(lead.renewal_on).toLocaleDateString("en-CA")}
                            {days !== null && (
                              <span className="ml-1.5">
                                {days < 0 ? `(${Math.abs(days)}d overdue)` : `(in ${days}d)`}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-400">— set a term to book one</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                        {lead.deal_value ? `$${Number(lead.deal_value).toLocaleString()}` : "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---- Everything ---- */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
          All leads ({leads.length})
        </h2>
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                <th className="px-4 py-2.5 font-semibold">Company</th>
                <th className="px-4 py-2.5 font-semibold">Tier</th>
                <th className="px-4 py-2.5 font-semibold">Stage</th>
                <th className="px-4 py-2.5 font-semibold">Next</th>
                <th className="px-4 py-2.5 text-right font-semibold">Value</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => (
                <tr key={lead.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{lead.company}</div>
                    <div className="text-xs text-gray-500">
                      {lead.contact_name ? `${lead.contact_name} · ` : ""}
                      {lead.email || "no email"}
                      {!lead.consent_basis && lead.tier !== "decline" && (
                        <span className="ml-1.5 text-amber-700">· consent not set</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{TIER_LABEL[lead.tier] ?? lead.tier}</td>
                  <td className="px-4 py-3">
                    <select
                      value={lead.stage}
                      disabled={busy === lead.id}
                      onChange={event => patchLead(lead.id, { stage: event.target.value })}
                      className={`rounded px-2 py-1 text-xs font-medium ${STAGE_STYLE[lead.stage] ?? "bg-gray-100"}`}
                    >
                      {STAGES.map(stage => (
                        <option key={stage} value={stage}>
                          {stage}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {lead.next_action_on ? (
                      new Date(lead.next_action_on).toLocaleDateString("en-CA")
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                    {lead.deal_value ? `$${Number(lead.deal_value).toLocaleString()}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {leads.length === 0 && (
          <p className="mt-4 flex items-center gap-2 text-sm text-gray-500">
            <Mail className="h-4 w-4" /> No leads yet — add one above, or connect the sheet sync.
          </p>
        )}
      </section>
    </div>
  )
}
