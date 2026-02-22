import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function CalgaryGuidesPage() {
  redirect('/guides?city=calgary')
}
