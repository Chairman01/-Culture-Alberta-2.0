#!/usr/bin/env node
/**
 * Threads API token helper.
 *
 * Turns the short-lived token Meta hands you in the App Dashboard into the two
 * values lib/social/threads.ts needs, and refreshes them later.
 *
 * Nothing is sent anywhere except graph.threads.net — run it locally and paste
 * the output into Vercel yourself.
 *
 *   Exchange (first time):
 *     node scripts/threads-token.mjs exchange <short-lived-token> <threads-app-secret>
 *
 *   Refresh (every 60 days, or the integration dies):
 *     node scripts/threads-token.mjs refresh <current-long-lived-token>
 *
 *   Check what you have:
 *     node scripts/threads-token.mjs check <token>
 */

const API = 'https://graph.threads.net'

function die(msg) {
  console.error(`\n✗ ${msg}\n`)
  process.exit(1)
}

async function getJson(url, label) {
  const res = await fetch(url)
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = json?.error
    die(`${label} failed (${res.status}): ${err?.message ?? JSON.stringify(json).slice(0, 400)}`)
  }
  return json
}

function reportExpiry(seconds) {
  if (typeof seconds !== 'number') return
  const days = Math.round(seconds / 86400)
  const expires = new Date(Date.now() + seconds * 1000)
  console.log(`  Valid for:  ${days} days (until ${expires.toISOString().slice(0, 10)})`)
}

async function whoami(token) {
  const me = await getJson(
    `${API}/v1.0/me?fields=id,username&access_token=${encodeURIComponent(token)}`,
    'Fetching Threads user'
  )
  return me
}

async function exchange(shortToken, appSecret) {
  if (!shortToken || !appSecret) {
    die('Usage: node scripts/threads-token.mjs exchange <short-lived-token> <threads-app-secret>')
  }

  console.log('\nExchanging short-lived token for a 60-day token…')
  const long = await getJson(
    `${API}/access_token?grant_type=th_exchange_token` +
      `&client_secret=${encodeURIComponent(appSecret)}` +
      `&access_token=${encodeURIComponent(shortToken)}`,
    'Token exchange'
  )

  const me = await whoami(long.access_token)

  console.log(`\n✓ Linked to @${me.username}`)
  reportExpiry(long.expires_in)
  console.log('\nAdd these two to Vercel (Settings → Environment Variables):\n')
  console.log(`THREADS_USER_ID=${me.id}`)
  console.log(`THREADS_ACCESS_TOKEN=${long.access_token}`)
  console.log(
    '\n⚠  Diarise a refresh before this expires — an expired token cannot be\n' +
      '   refreshed, only replaced by redoing the whole OAuth flow.\n'
  )
}

async function refresh(currentToken) {
  if (!currentToken) {
    die('Usage: node scripts/threads-token.mjs refresh <current-long-lived-token>')
  }

  console.log('\nRefreshing…')
  const next = await getJson(
    `${API}/refresh_access_token?grant_type=th_refresh_token` +
      `&access_token=${encodeURIComponent(currentToken)}`,
    'Token refresh'
  )

  console.log('\n✓ Refreshed.')
  reportExpiry(next.expires_in)
  console.log('\nReplace THREADS_ACCESS_TOKEN in Vercel with:\n')
  console.log(`THREADS_ACCESS_TOKEN=${next.access_token}\n`)
}

async function check(token) {
  if (!token) die('Usage: node scripts/threads-token.mjs check <token>')
  const me = await whoami(token)
  console.log(`\n✓ Token is valid — @${me.username} (id ${me.id})\n`)
}

const [command, ...rest] = process.argv.slice(2)

switch (command) {
  case 'exchange':
    await exchange(rest[0], rest[1])
    break
  case 'refresh':
    await refresh(rest[0])
    break
  case 'check':
    await check(rest[0])
    break
  default:
    die(
      'Usage:\n' +
        '  node scripts/threads-token.mjs exchange <short-lived-token> <threads-app-secret>\n' +
        '  node scripts/threads-token.mjs refresh  <current-long-lived-token>\n' +
        '  node scripts/threads-token.mjs check    <token>'
    )
}
