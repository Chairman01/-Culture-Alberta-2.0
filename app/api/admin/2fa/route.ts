/**
 * Two-factor enrolment for the signed-in admin.
 *
 * GET    → current state
 * POST   { action: 'begin' }              → a fresh secret to add to the app
 * POST   { action: 'confirm', code }      → prove the app works, switch it on
 * DELETE                       { code }   → turn it off, proving identity first
 *
 * Admin only, and always operates on the CALLER'S OWN account. There is no
 * account id in the request: an admin enabling or clearing someone else's
 * second factor is a way to lock a colleague out, or to strip their protection.
 */

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { requireAdmin } from '@/lib/admin-auth'
import { getTotp, stageTotpSecret, enableTotp, disableTotp } from '@/lib/admin-users'
import { generateSecret, verifyCode, otpauthUri, formatSecret, generateBackupCodes } from '@/lib/totp'

export const dynamic = 'force-dynamic'

/**
 * The owner has no admin_users row, so their secret lives in ADMIN_TOTP_SECRET.
 * Nothing here can write an environment variable — enrolment for the owner ends
 * with "paste this into Vercel", which is also why they need no backup codes.
 */
function isEnvOwner(auth: { userId: string | null }) {
  return !auth.userId
}

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  if (isEnvOwner(auth)) {
    return NextResponse.json({
      mode: 'env',
      enabled: !!process.env.ADMIN_TOTP_SECRET?.trim(),
      backupCodesLeft: null,
    })
  }

  const totp = await getTotp(auth.userId!)
  return NextResponse.json({
    mode: 'account',
    enabled: !!totp?.enabled,
    backupCodesLeft: totp?.backupCodes.length ?? 0,
  })
}

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  const body = await request.json().catch(() => ({}))
  const account = auth.username || 'admin'

  if (body.action === 'begin') {
    const secret = generateSecret()

    // For a database account the secret is stored straight away but stays
    // switched off until a code proves the app actually holds it. For the owner
    // it is only shown — they put it in Vercel themselves.
    if (!isEnvOwner(auth)) await stageTotpSecret(auth.userId!, secret)

    return NextResponse.json({
      secret,
      formatted: formatSecret(secret),
      uri: otpauthUri(secret, account),
      mode: isEnvOwner(auth) ? 'env' : 'account',
    })
  }

  if (body.action === 'confirm') {
    const code = String(body.code ?? '')

    if (isEnvOwner(auth)) {
      // Nothing to store: confirm only checks the pasted secret really produces
      // the code the app is showing, so a typo cannot lock the owner out.
      const secret = String(body.secret ?? '')
      if (!secret) return NextResponse.json({ error: 'No secret supplied' }, { status: 400 })
      if (!verifyCode(secret, code)) {
        return NextResponse.json({ error: 'That code does not match. Check the key and try again.' }, { status: 400 })
      }
      return NextResponse.json({ ok: true, mode: 'env' })
    }

    const totp = await getTotp(auth.userId!)
    if (!totp?.secret) {
      return NextResponse.json({ error: 'Start the setup again' }, { status: 400 })
    }
    if (!verifyCode(totp.secret, code)) {
      return NextResponse.json({ error: 'That code is not right. Check the clock on your phone.' }, { status: 400 })
    }

    const backupCodes = generateBackupCodes()
    const hashes = await Promise.all(backupCodes.map(c => bcrypt.hash(c, 10)))
    await enableTotp(auth.userId!, hashes)

    console.log(`[2fa] enabled for ${auth.username}`)
    // Shown once, stored only as hashes.
    return NextResponse.json({ ok: true, backupCodes })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function DELETE(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  if (isEnvOwner(auth)) {
    return NextResponse.json(
      { error: 'Remove ADMIN_TOTP_SECRET from Vercel to turn this off for the owner account.' },
      { status: 400 },
    )
  }

  const body = await request.json().catch(() => ({}))
  const totp = await getTotp(auth.userId!)
  if (!totp?.enabled || !totp.secret) return NextResponse.json({ ok: true })

  // A current code is required to switch it off. Otherwise anyone who walked up
  // to an unlocked laptop could quietly remove the protection and leave.
  if (!verifyCode(totp.secret, String(body.code ?? ''))) {
    return NextResponse.json({ error: 'Enter a current code to turn this off' }, { status: 400 })
  }

  await disableTotp(auth.userId!)
  console.warn(`[2fa] disabled for ${auth.username}`)
  return NextResponse.json({ ok: true })
}
