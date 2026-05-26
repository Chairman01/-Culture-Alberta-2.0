import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Best of Alberta | Culture Alberta',
  description: 'The best restaurants, bars, experiences, and hidden gems in Calgary, Edmonton, and across Alberta — curated by Culture Alberta editors.',
  keywords: 'best Alberta restaurants, best Calgary, best Edmonton, top places Alberta, Alberta hidden gems, Alberta editors picks',
  alternates: { canonical: 'https://www.culturealberta.com/best-of' },
  openGraph: {
    title: 'Best of Alberta | Culture Alberta',
    description: 'The best restaurants, bars, experiences, and hidden gems in Calgary, Edmonton, and across Alberta.',
    url: 'https://www.culturealberta.com/best-of',
    type: 'website',
  },
}

export default function BestOfLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
