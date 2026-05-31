import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Shop Culture Alberta | Alberta City Hoodies & Merch',
  description: 'Official Culture Alberta merchandise — hoodies for Edmonton, Calgary, Lethbridge, Medicine Hat, Red Deer, and Grande Prairie. Made on demand, shipped across Canada.',
  keywords: 'Alberta hoodie, Calgary hoodie, Edmonton hoodie, Lethbridge hoodie, Medicine Hat hoodie, Red Deer hoodie, Grande Prairie hoodie, Alberta merch',
  alternates: { canonical: 'https://www.culturealberta.com/shop' },
  openGraph: {
    title: 'Shop Culture Alberta | Alberta City Hoodies & Merch',
    description: 'Official Culture Alberta merchandise for every Alberta city. Made on demand, shipped across Canada.',
    url: 'https://www.culturealberta.com/shop',
    type: 'website',
  },
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children
}
