/**
 * The one Google service account used for read-only reporting.
 *
 * Env: GOOGLE_ANALYTICS_CREDENTIALS — the service-account JSON, base64-encoded
 * (the same variable lib/google-analytics.ts already reads, so one secret
 * serves both). The account needs:
 *   - Viewer on the GA4 property named by GA4_PROPERTY_ID
 *   - a user (Full or Restricted) on the Search Console property GSC_SITE_URL
 *
 * As of 2026-09-01 none of these were set in Vercel, so every Google collector
 * in /api/cron/seo-vitals reports `skipped` until they are.
 */

export interface ServiceAccountKey {
  client_email: string
  private_key: string
  project_id?: string
}

export function loadServiceAccount(): ServiceAccountKey | null {
  const encoded = process.env.GOOGLE_ANALYTICS_CREDENTIALS
  if (!encoded) return null
  try {
    const key = JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'))
    if (!key?.client_email || !key?.private_key) return null
    return key as ServiceAccountKey
  } catch {
    return null
  }
}
