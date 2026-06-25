import { redirect } from 'next/navigation'

export default function EdmontonGuidesPage() {
  redirect('/guides?city=edmonton')
}
