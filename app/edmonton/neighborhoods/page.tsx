import { redirect } from 'next/navigation'

export default function EdmontonNeighborhoodsPage() {
  redirect('/neighborhoods?city=edmonton')
}
