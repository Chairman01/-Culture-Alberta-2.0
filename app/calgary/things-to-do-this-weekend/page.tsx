import type { Metadata } from 'next'
import { WeekendHubPage, buildWeekendHubMetadata } from '@/components/weekend-hub-page'

// Guides go up on Thursdays; publishing one also revalidates this page directly.
export const revalidate = 900

export function generateMetadata(): Promise<Metadata> {
  return buildWeekendHubMetadata('calgary')
}

export default function Page() {
  return <WeekendHubPage city="calgary" />
}
