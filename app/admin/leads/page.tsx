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
  Clock,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Reply,
  SkipForward,
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
  consent_basis: string | null
  notes: string | null
  draft: Draft | null
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

  const queue = leads.filter(lead => lead.draft && lead.draft.status === "pending")
  const replied = leads.filter(lead => lead.last_reply_at && !["won", "lost", "declined"].includes(lead.stage))
  const won = leads.filter(lead => lead.stage === "won")
  const pipelineValue = won.reduce((total, lead) => total + Number(lead.deal_value || 0), 0)

  async function actionDraft(lead: Lead, action: "approve" | "skip" | "snooze") {
    if (!lead.draft) return
    setBusy(lead.draft.id)
    try {
      const edited = edits[lead.draft.id]
      const response = await fetch("/api/admin/leads/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId: lead.draft.id,
          action,
          ...(action === "approve" && edited ? { subject: edited.subject, body: edited.body } : {}),
          ...(action === "snooze" ? { days: 3 } : {}),
        }),
      })
      const result = await response.json()

      if (result.status === "approved_not_sent") {
        toast({ title: "Saved, but not sent", description: result.error, variant: "destructive" })
      } else if (!response.ok || result.ok === false) {
        toast({ title: "That did not go through", description: result.error, variant: "destructive" })
      } else {
        const verb = action === "approve" ? "Sent to" : action === "skip" ? "Skipped" : "Snoozed"
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
          <h1 className="text-2xl font-bold tracking-tight">Pipeline</h1>
          <p className="mt-1 text-sm text-gray-500">
            {queue.length} waiting for you · {replied.length} replied · {won.length} won
            {pipelineValue > 0 && ` · $${pipelineValue.toLocaleString()} booked`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setAdding(value => !value)}>
            <Plus className="mr-1.5 h-4 w-4" /> Add lead
          </Button>
        </div>
      </div>

      {/* Setup warnings. A half-connected system that fails silently is worse
          than one that says plainly what is missing. */}
      {setup?.zoho && (
        <div className="mb-4 flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <strong>Zoho is not connected.</strong> Drafts will queue up but nothing can send, and replies will not be
            detected. Missing: <code className="font-mono text-xs">{setup.zoho.join(", ")}</code>
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
          Waiting for approval
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

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" disabled={busy === draft.id} onClick={() => actionDraft(lead, "approve")}>
                      {busy === draft.id ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="mr-1.5 h-4 w-4" />
                      )}
                      Approve &amp; send
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy === draft.id} onClick={() => actionDraft(lead, "snooze")}>
                      <Clock className="mr-1.5 h-4 w-4" /> Snooze 3 days
                    </Button>
                    <Button size="sm" variant="ghost" disabled={busy === draft.id} onClick={() => actionDraft(lead, "skip")}>
                      <SkipForward className="mr-1.5 h-4 w-4" /> Skip this step
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
