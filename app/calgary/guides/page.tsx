import { redirect } from 'next/navigation'

export default function CalgaryGuidesPage() {
  redirect('/guides?city=calgary')
}
