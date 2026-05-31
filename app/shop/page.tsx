import { Metadata } from 'next'
import Script from 'next/script'

import { ShopClient } from './shop-client'

export const metadata: Metadata = {
  title: 'Alberta Hoodies & City Merch | Culture Alberta Shop',
  description: 'Shop Edmonton, Calgary, Lethbridge, Medicine Hat, Red Deer, and Grande Prairie hoodies from Culture Alberta. Premium city apparel made on demand and shipped across Canada.',
  alternates: { canonical: 'https://www.culturealberta.com/shop' },
  keywords: [
    'Alberta hoodies',
    'Edmonton hoodies',
    'Calgary hoodies',
    'Lethbridge hoodies',
    'Medicine Hat hoodies',
    'Red Deer hoodies',
    'Grande Prairie hoodies',
    'Alberta merch',
    'Alberta apparel',
  ],
  openGraph: {
    title: 'Alberta Hoodies & City Merch | Culture Alberta Shop',
    description: 'Premium hoodies for Edmonton, Calgary, Lethbridge, Medicine Hat, Red Deer, and Grande Prairie. Made on demand by Culture Alberta.',
    url: 'https://www.culturealberta.com/shop',
    type: 'website',
  },
}

export default function ShopPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Culture Alberta Shop',
    url: 'https://www.culturealberta.com/shop',
    description: metadata.description,
  }

  return (
    <>
      <Script
        id="shop-collection-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <ShopClient />
    </>
  )
}
