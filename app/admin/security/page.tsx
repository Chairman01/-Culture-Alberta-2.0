"use client"

import { useState, useEffect, useCallback } from "react"
import { ShieldCheck, ShieldAlert, Loader2, Copy, Check, Smartphone, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

type State = { mode: "env" | "account"; enabled: boolean; backupCodesLeft: number | null }
type Setup = { secret: string; formatted: string; uri: string; mode: "env" | "account" }

export default function SecurityPage() {
  const [state, setState] = useState<State | null>(null)
  const [setup, setSetup] = useState<Setup | null>(null)
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)
  const [disableCode, setDisableCode] = useState("")
  const { toast } = useToast()

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/2fa")
    if (res.ok) setState(await res.json())
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const copy = async (text: string, what: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(what)
    setTimeout(() => setCopied(null), 2000)
  }

  const begin = async () => {
    setBusy(true)
    try {
      const res = await fetch("/api/admin/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "begin" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSetup(data)
      setCode("")
    } catch (e) {
      toast({ title: "Could not start setup", description: String(e), variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  const confirm = async () => {
    setBusy(true)
    try {
      const res = await fetch("/api/admin/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", code, secret: setup?.secret }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (data.backupCodes) setBackupCodes(data.backupCodes)
      if (setup?.mode === "env") {
        toast({
          title: "Code verified",
          description: "Now add ADMIN_TOTP_SECRET to Vercel and redeploy to switch it on.",
        })
      } else {
        toast({ title: "Two-factor is on" })
        setSetup(null)
      }
      load()
    } catch (e) {
      toast({ title: "That did not work", description: String(e), variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  const turnOff = async () => {
    setBusy(true)
    try {
      const res = await fetch("/api/admin/2fa", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: disableCode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: "Two-factor is off" })
      setDisableCode("")
      load()
    } catch (e) {
      toast({ title: "Could not turn it off", description: String(e), variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6" /> Security
        </h1>
        <p className="text-gray-600 mt-1">
          A second step at sign-in, so a stolen password is not enough on its own.
        </p>
      </div>

      {!state ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="rounded-lg border bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              <span className="font-semibold">Authenticator app</span>
            </div>
            <Badge variant={state.enabled ? "default" : "secondary"}>
              {state.enabled ? "On" : "Off"}
            </Badge>
          </div>

          {state.enabled && state.backupCodesLeft !== null && (
            <p className="text-sm text-gray-600">
              {state.backupCodesLeft} recovery {state.backupCodesLeft === 1 ? "code" : "codes"} left.
            </p>
          )}

          {state.mode === "env" && (
            <p className="text-sm text-gray-600">
              You are signed in as the owner account, which lives in the environment rather than the
              team list. Its secret goes in Vercel as <code>ADMIN_TOTP_SECRET</code> — that is also
              how you recover a lost phone, by deleting it.
            </p>
          )}

          {/* ── Enrolment ─────────────────────────────────────────────── */}
          {!state.enabled && !setup && (
            <Button onClick={begin} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
              Set up two-factor
            </Button>
          )}

          {setup && (
            <div className="space-y-4 rounded-md border bg-gray-50 p-4">
              <div>
                <p className="font-medium text-sm">1. Add it to your authenticator</p>
                <p className="text-sm text-gray-600 mt-1">
                  On your phone, tap the link below and it will add itself. On a computer, type the
                  key into your app by hand.
                </p>
              </div>

              <a
                href={setup.uri}
                className="inline-block text-sm underline underline-offset-2 break-all"
              >
                Add to authenticator app
              </a>

              <div>
                <Label className="text-xs">Setup key</Label>
                <div className="flex gap-2 mt-1">
                  <code className="flex-1 rounded border bg-white px-3 py-2 text-sm tracking-wider break-all">
                    {setup.formatted}
                  </code>
                  <Button variant="outline" size="sm" onClick={() => copy(setup.secret, "secret")}>
                    {copied === "secret" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {setup.mode === "env" && (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  <p className="font-medium">2. Put it in Vercel</p>
                  <p className="mt-1">
                    Add an environment variable named <code>ADMIN_TOTP_SECRET</code> with the key
                    above, then redeploy. Verify the code below first — a mistyped key would lock you
                    out of your own admin.
                  </p>
                </div>
              )}

              <div>
                <p className="font-medium text-sm">
                  {setup.mode === "env" ? "3." : "2."} Enter the current code
                </p>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    inputMode="numeric"
                    className="w-32 tracking-[0.3em] text-center"
                  />
                  <Button onClick={confirm} disabled={busy || code.length !== 6}>
                    {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Verify
                  </Button>
                  <Button variant="ghost" onClick={() => setSetup(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── Recovery codes, shown exactly once ────────────────────── */}
          {backupCodes && (
            <div className="rounded-md border border-green-300 bg-green-50 p-4 space-y-3">
              <div>
                <p className="font-medium text-green-900">Save your recovery codes</p>
                <p className="text-sm text-green-800 mt-1">
                  Each one works once, if you lose your phone. This is the only time they are shown —
                  without them, a lost phone means losing access to the admin entirely.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map(c => (
                  <code key={c} className="rounded border bg-white px-2 py-1">
                    {c}
                  </code>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => copy(backupCodes.join("\n"), "codes")}>
                  {copied === "codes" ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
                  Copy all
                </Button>
                <Button size="sm" onClick={() => setBackupCodes(null)}>
                  I have saved them
                </Button>
              </div>
            </div>
          )}

          {/* ── Turn it off ──────────────────────────────────────────── */}
          {state.enabled && state.mode === "account" && !setup && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4" /> Turn two-factor off
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Enter a current code to confirm it is you.
              </p>
              <div className="flex gap-2 mt-2">
                <Input
                  value={disableCode}
                  onChange={e => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  inputMode="numeric"
                  className="w-32 tracking-[0.3em] text-center"
                />
                <Button variant="outline" onClick={turnOff} disabled={busy || disableCode.length !== 6}>
                  Turn off
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
