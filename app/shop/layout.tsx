import { Metadata } from 'next'
import { Playfair_Display } from 'next/font/google'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['700', '800', '900'],
})

export const metadata: Metadata = {
  title: 'Shop Culture Alberta | Alberta Hoodies & Merch',
  description: 'Official Culture Alberta merchandise — hoodies and apparel celebrating Calgary, Edmonton, and Alberta. Made after purchase, shipped across Canada.',
  keywords: 'Alberta hoodie, Calgary hoodie, Edmonton hoodie, Alberta merch, Culture Alberta shop',
  alternates: { canonical: 'https://www.culturealberta.com/shop' },
  openGraph: {
    title: 'Shop Culture Alberta | Alberta Hoodies & Merch',
    description: 'Official Culture Alberta merchandise celebrating Calgary, Edmonton, and Alberta. Made after purchase, shipped across Canada.',
    url: 'https://www.culturealberta.com/shop',
    type: 'website',
  },
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <div className={playfair.variable}>{children}</div>
}
