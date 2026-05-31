import { Metadata } from 'next'
import Script from 'next/script'

import { ShopClient } from '../shop-client'

// Slug → city mapping for SEO pages
const SLUG_MAP: Record<string, { city: string; title: string; description: string; keywords: string[] }> = {
  'edmonton-hoodies': {
    city: 'Edmonton',
    title: 'Edmonton Hoodies | Edmonton Forever Merch by Culture Alberta',
    description: 'Shop Edmonton hoodies and Edmonton merch from Culture Alberta. Heavyweight city apparel designed in Alberta and made on demand.',
    keywords: ['Edmonton hoodies', 'Edmonton hoodie', 'Edmonton merch', 'YEG hoodie'],
  },
  'calgary-hoodies': {
    city: 'Calgary',
    title: 'Calgary Hoodies | Calgary Forever Merch by Culture Alberta',
    description: 'Shop Calgary hoodies and Calgary merch from Culture Alberta. Premium city apparel designed in Alberta and made on demand.',
    keywords: ['Calgary hoodies', 'Calgary hoodie', 'Calgary merch', 'YYC hoodie'],
  },
  'lethbridge-hoodies': {
    city: 'Lethbridge',
    title: 'Lethbridge Hoodies | Lethbridge Forever Merch by Culture Alberta',
    description: 'Shop Lethbridge hoodies and Lethbridge merch from Culture Alberta. Premium city apparel made on demand.',
    keywords: ['Lethbridge hoodies', 'Lethbridge hoodie', 'Lethbridge merch', 'YQL hoodie'],
  },
  'medicine-hat-hoodies': {
    city: 'Medicine Hat',
    title: 'Medicine Hat Hoodies | Medicine Hat Forever Merch by Culture Alberta',
    description: 'Shop Medicine Hat hoodies and merch from Culture Alberta. Made on demand and shipped across Canada.',
    keywords: ['Medicine Hat hoodies', 'Medicine Hat hoodie', 'Medicine Hat merch'],
  },
  'red-deer-hoodies': {
    city: 'Red Deer',
    title: 'Red Deer Hoodies | Red Deer Forever Merch by Culture Alberta',
    description: 'Shop Red Deer hoodies and Red Deer merch from Culture Alberta. Premium apparel made on demand.',
    keywords: ['Red Deer hoodies', 'Red Deer hoodie', 'Red Deer merch', 'YQF hoodie'],
  },
  'grande-prairie-hoodies': {
    city: 'Grande Prairie',
    title: 'Grande Prairie Hoodies | Grande Prairie Forever Merch by Culture Alberta',
    description: 'Shop Grande Prairie hoodies and merch from Culture Alberta. Made on demand, shipped across Canada.',
    keywords: ['Grande Prairie hoodies', 'Grande Prairie hoodie', 'Grande Prairie merch', 'YQU hoodie'],
  },
  'alberta-hoodies': {
    city: 'Alberta',
    title: 'Alberta Hoodies | Alberta Forever Merch by Culture Alberta',
    description: 'Shop Alberta hoodies and merch from Culture Alberta. Premium apparel celebrating Alberta cities and local pride.',
    keywords: ['Alberta hoodies', 'Alberta hoodie', 'Alberta merch', 'Alberta apparel'],
  },
}

export function generateStaticParams() {
  return Object.keys(SLUG_MAP).map(slug => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const entry = SLUG_MAP[slug]
  if (!entry) return {}

  return {
    title: entry.title,
    description: entry.description,
    keywords: entry.keywords,
    alternates: { canonical: `https://www.culturealberta.com/shop/${slug}` },
    openGraph: {
      title: entry.title,
      description: entry.description,
      url: `https://www.culturealberta.com/shop/${slug}`,
      type: 'website',
    },
  }
}

export default async function CityShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const entry = SLUG_MAP[slug]

  const structuredData = entry
    ? {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: entry.title,
        description: entry.description,
        url: `https://www.culturealberta.com/shop/${slug}`,
      }
    : null

  return (
    <>
      {structuredData && (
        <Script
          id={`${slug}-jsonld`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      <ShopClient initialCity={entry?.city ?? 'All'} />
    </>
  )
}
