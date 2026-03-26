import { Playfair_Display } from 'next/font/google'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['700', '800', '900'],
})

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <div className={playfair.variable}>{children}</div>
}
