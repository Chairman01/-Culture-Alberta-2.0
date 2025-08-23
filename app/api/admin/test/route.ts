import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const adminUsername = process.env.ADMIN_USERNAME
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH
    const jwtSecret = process.env.JWT_SECRET

    return NextResponse.json({
      success: true,
      environmentVariables: {
        hasAdminUsername: !!adminUsername,
        hasAdminPasswordHash: !!adminPasswordHash,
        hasJwtSecret: !!jwtSecret,
        adminUsername,
        adminPasswordHashLength: adminPasswordHash?.length,
        jwtSecretLength: jwtSecret?.length
      }
    })
  } catch (error) {
    console.error('Test API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
