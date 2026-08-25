"use client"

import { useState, useEffect, useCallback } from "react"
import { Loader2, UserPlus, KeyRound, PenLine, Copy, Check, Users, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"

interface TeamMember {
  id: string
  username: string
  displayName: string
  role: "admin" | "contributor"
  isActive: boolean
  createdAt: string
  lastLoginAt: string | null
}

/** A password is returned by the API exactly once. This is the only chance to copy it. */
interface NewCredential {
  displayName: string
  username: string
  password: string
}

function formatWhen(value: string | null) {
  if (!value) return "Never signed in"
  return new Date(value).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [credential, setCredential] = useState<NewCredential | null>(null)
  const [disableTarget, setDisableTarget] = useState<TeamMember | null>(null)
  const [renameTarget, setRenameTarget] = useState<TeamMember | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [form, setForm] = useState({ displayName: "", username: "", role: "contributor" as "admin" | "contributor" })
  const { toast } = useToast()

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/admin/team")
      const data = await res.json()
      if (!res.ok) throw new Error(data.hint ? `${data.error} — ${data.hint}` : data.error)
      setMembers(data.users || [])
      setLoadError(null)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load the team")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Suggest a username from the display name, but stop once it has been edited.
  const onDisplayNameChange = (value: string) => {
    setForm(prev => {
      const suggested = prev.displayName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "")
      const untouched = prev.username === suggested
      return {
        ...prev,
        displayName: value,
        username: untouched ? value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "") : prev.username,
      }
    })
  }

  const createMember = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsCreating(true)
    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setCredential({ displayName: data.user.displayName, username: data.user.username, password: data.password })
      setCopied(false)
      setForm({ displayName: "", username: "", role: "contributor" })
      load()
    } catch (error) {
      toast({
        title: "Could not create the account",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const patch = async (
    member: TeamMember,
    action: "enable" | "disable" | "reset-password" | "rename",
    extra?: Record<string, unknown>,
  ) => {
    setBusyId(member.id)
    try {
      const res = await fetch(`/api/admin/team/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (action === "reset-password") {
        setCredential({ displayName: member.displayName, username: member.username, password: data.password })
        setCopied(false)
      } else if (action === "rename") {
        toast({
          title: `Now publishing as ${extra?.displayName}`,
          description: data.articlesUpdated
            ? `${data.articlesUpdated} existing article${data.articlesUpdated === 1 ? "" : "s"} rebylined.`
            : "No existing articles to update.",
        })
      } else {
        toast({
          title: action === "disable" ? `${member.displayName} can no longer sign in` : `${member.displayName} can sign in again`,
        })
      }
      load()
    } catch (error) {
      toast({
        title: "That did not work",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setBusyId(null)
      setDisableTarget(null)
      setRenameTarget(null)
    }
  }

  const copyCredential = async () => {
    if (!credential) return
    const text = `Culture Alberta admin\nhttps://www.culturealberta.com/admin/login\nUsername: ${credential.username}\nPassword: ${credential.password}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" /> Team
        </h1>
        <p className="text-gray-600 mt-1">
          Everyone who can sign in to the admin panel. Writers get their own login so their drafts stay their own
          and you can tell whose work you are reviewing.
        </p>
      </div>

      {/* ── Add someone ─────────────────────────────────────────────────── */}
      <form onSubmit={createMember} className="rounded-lg border bg-white p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <UserPlus className="h-4 w-4" /> Add a writer
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="displayName">Name</Label>
            <Input
              id="displayName"
              value={form.displayName}
              onChange={e => onDisplayNameChange(e.target.value)}
              placeholder="Tiffany"
              required
            />
            <p className="text-xs text-gray-500">Their byline, exactly as readers should see it.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={form.username}
              onChange={e => setForm(prev => ({ ...prev, username: e.target.value.toLowerCase() }))}
              placeholder="tiffany"
              pattern="[a-z0-9._\-]{2,40}"
              required
            />
            <p className="text-xs text-gray-500">What they type to sign in.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role">Access</Label>
            <select
              id="role"
              value={form.role}
              onChange={e => setForm(prev => ({ ...prev, role: e.target.value as "admin" | "contributor" }))}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="contributor">Writer — drafts only, you approve</option>
              <option value="admin">Admin — full access, can publish</option>
            </select>
            <p className="text-xs text-gray-500">Writers can never publish or send.</p>
          </div>
        </div>
        <Button type="submit" disabled={isCreating}>
          {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
          Create account
        </Button>
      </form>

      {/* ── The team ────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading the team…
        </div>
      ) : loadError ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 flex gap-3">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">The team list could not load.</p>
            <p className="mt-1">{loadError}</p>
          </div>
        </div>
      ) : members.length === 0 ? (
        <p className="text-gray-500">No accounts yet. Add your first writer above.</p>
      ) : (
        <div className="rounded-lg border bg-white divide-y">
          {members.map(member => (
            <div key={member.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{member.displayName}</span>
                  <span className="text-sm text-gray-500">@{member.username}</span>
                  <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                    {member.role === "admin" ? "Admin" : "Writer"}
                  </Badge>
                  {!member.isActive && <Badge variant="destructive">Disabled</Badge>}
                </div>
                <p className="text-xs text-gray-500 mt-1">Last signed in: {formatWhen(member.lastLoginAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                {/* A writer's byline comes from their account and never from
                    what they type into the author field, which is what stops
                    anyone publishing under someone else's name. Until now that
                    also made the name permanent — a writer wanting a pen name
                    had no way to ask for one. */}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busyId === member.id}
                  onClick={() => {
                    setRenameValue(member.displayName)
                    setRenameTarget(member)
                  }}
                >
                  <PenLine className="h-4 w-4 mr-1.5" /> Byline
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busyId === member.id}
                  onClick={() => patch(member, "reset-password")}
                >
                  <KeyRound className="h-4 w-4 mr-1.5" /> Reset password
                </Button>
                {member.isActive ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === member.id}
                    onClick={() => setDisableTarget(member)}
                  >
                    Disable
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === member.id}
                    onClick={() => patch(member, "enable")}
                  >
                    Re-enable
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── The one and only look at a new password ─────────────────────── */}
      <AlertDialog open={!!credential} onOpenChange={open => !open && setCredential(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign-in details for {credential?.displayName}</AlertDialogTitle>
            <AlertDialogDescription>
              Copy these now and send them to {credential?.displayName}. The password is stored only as a hash, so
              this is the last time it can be shown — if it is lost, reset it and send a new one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-md bg-gray-50 border p-3 font-mono text-sm space-y-1 break-all">
            <div>https://www.culturealberta.com/admin/login</div>
            <div>Username: {credential?.username}</div>
            <div>Password: {credential?.password}</div>
          </div>
          <AlertDialogFooter>
            <Button variant="outline" onClick={copyCredential}>
              {copied ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <AlertDialogAction onClick={() => setCredential(null)}>Done</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Byline ──────────────────────────────────────────────────────── */}
      <AlertDialog open={!!renameTarget} onOpenChange={open => !open && setRenameTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Byline for @{renameTarget?.username}</AlertDialogTitle>
            <AlertDialogDescription>
              The name readers see on everything they write. Changing it also rewrites the byline on
              their existing articles, so the same person never appears under two names.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="byline">Name</Label>
            <Input
              id="byline"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              placeholder="Erica Reed"
              maxLength={80}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!renameValue.trim() || renameValue.trim() === renameTarget?.displayName}
              onClick={() =>
                renameTarget && patch(renameTarget, "rename", { displayName: renameValue.trim() })
              }
            >
              Save byline
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Disable confirmation ────────────────────────────────────────── */}
      <AlertDialog open={!!disableTarget} onOpenChange={open => !open && setDisableTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable {disableTarget?.displayName}?</AlertDialogTitle>
            <AlertDialogDescription>
              They will not be able to sign in from that moment on. Everything they wrote stays exactly where it is,
              with their byline intact, and you can re-enable them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => disableTarget && patch(disableTarget, "disable")}>
              Disable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
