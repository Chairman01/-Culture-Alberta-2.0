import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Partner with Culture Alberta | Advertising & Sponsorship',
  description: 'Partner with Culture Alberta to reach engaged Alberta readers. Advertising, sponsored content, event promotion, and brand partnerships for Calgary, Edmonton, and beyond.',
  keywords: 'advertise Alberta, sponsor Alberta media, Calgary advertising, Edmonton advertising, Alberta brand partnership',
  alternates: { canonical: 'https://www.culturealberta.com/partner' },
  openGraph: {
    title: 'Partner with Culture Alberta',
    description: 'Reach engaged Alberta readers through advertising, sponsored content, and brand partnerships.',
    url: 'https://www.culturealberta.com/partner',
    type: 'website',
  },
}

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
