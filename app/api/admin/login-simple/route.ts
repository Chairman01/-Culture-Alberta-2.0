import { NextResponse } from 'next/server'

// This endpoint has been disabled. Use /api/admin/login instead.
export async function POST() {
  return NextResponse.json({ message: 'This endpoint is no longer available.' }, { status: 410 })
}
