"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function AdminLogin() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  // Set once the password step passes on an account with a second factor.
  const [challenge, setChallenge] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const router = useRouter()

  /** Shared by both steps: a successful response ends the same way. */
  const finishSignIn = (data: {
    username: string
    token: string
    role?: string
    name?: string
  }) => {
    // Store auth state for client-side UI checks (token also set as httpOnly cookie)
    localStorage.setItem("admin_authenticated", "true")
    localStorage.setItem("admin_user", data.username)
    localStorage.setItem("admin_login_time", Date.now().toString())
    localStorage.setItem("admin_token", data.token)
    localStorage.setItem("admin_role", data.role ?? "admin")
    // The byline, which is not always the username: Tiffany signs in as
    // "tiffany" but her articles are written by "Tiffany".
    localStorage.setItem("admin_name", data.name ?? data.username)
    router.push(data.role === "contributor" ? "/admin/articles" : "/admin")
  }

  const describeFailure = async (response: Response, fallback: string) => {
    if (response.status === 503) {
      return "Admin login is not configured correctly. Check the Vercel environment variables."
    }
    if (response.status === 429) {
      const retry = Number(response.headers.get("Retry-After") || 0)
      const wait = retry >= 60 ? `${Math.ceil(retry / 60)} minute(s)` : `${retry || 30} seconds`
      return `Too many attempts. Try again in ${wait}.`
    }
    const data = await response.json().catch(() => ({}))
    return data.message || fallback
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      if (response.ok) {
        const data = await response.json()
        // The password was right but this account has a second factor. No
        // session yet — hold the short-lived challenge and ask for the code.
        if (data.requires2FA) {
          setChallenge(data.challenge)
          setCode("")
          return
        }
        finishSignIn(data)
      } else {
        setError(await describeFailure(response, "Invalid username or password"))
      }
    } catch {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge, code }),
      })

      if (response.ok) {
        finishSignIn(await response.json())
      } else {
        setError(await describeFailure(response, "That code is not right."))
        // An expired challenge cannot be retried — send them back to the start
        // rather than leaving them typing codes that can never work.
        if (response.status === 401) {
          const data = await response.clone().json().catch(() => ({}))
          if (String(data.message || "").includes("expired")) setChallenge(null)
        }
      }
    } catch {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-6 shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Admin Access
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your credentials to access the admin panel
          </p>
        </div>

        {/* Second step: the password was right, now prove the phone. Rendered
            instead of the credential fields so there is only ever one thing to
            do on screen. */}
        {challenge ? (
          <form className="mt-8 space-y-6" onSubmit={handleVerifyCode}>
            <div className="text-center">
              <p className="text-sm text-gray-700">
                Enter the 6-digit code from your authenticator app.
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Lost your phone? Use one of your recovery codes instead.
              </p>
            </div>

            <Input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\s/g, "").slice(0, 20))}
              disabled={isLoading}
              className="text-center tracking-[0.4em] text-lg"
            />

            {error && (
              <div className="text-center text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading || code.length < 6}>
              {isLoading ? "Checking..." : "Verify"}
            </Button>

            <button
              type="button"
              onClick={() => {
                setChallenge(null)
                setCode("")
                setError("")
              }}
              className="w-full text-sm text-gray-500 hover:text-gray-700"
            >
              Start over
            </button>
          </form>
        ) : (
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="username" className="sr-only">Username</label>
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <div className="text-center text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        )}

        <div className="text-center">
          <a href="/" className="text-sm text-blue-600 hover:text-blue-500 transition-colors">
            Back to website
          </a>
        </div>
      </div>
    </div>
  )
}
