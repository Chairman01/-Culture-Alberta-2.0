import { redirect } from 'next/navigation'

export default function CalgaryNeighborhoodsPage() {
  redirect('/neighborhoods?city=calgary')
}
