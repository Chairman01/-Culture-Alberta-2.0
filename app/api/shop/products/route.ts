import { NextResponse } from 'next/server'

const STOREFRONT_BASE = 'https://storefront-api.fourthwall.com'
const TOKEN = process.env.FOURTHWALL_STOREFRONT_TOKEN

export interface FWVariant {
  id: string
  name: string
  sku: string
  unitPrice: { value: number; currency: string }
  stock: { type: 'LIMITED' | 'UNLIMITED'; inStock?: number }
}

export interface FWProduct {
  id: string
  name: string
  slug: string
  description: string
  variants: FWVariant[]
  images?: Array<{ url: string }>
}

export async function GET() {
  if (!TOKEN) {
    return NextResponse.json({ error: 'Storefront token not configured' }, { status: 503 })
  }

  try {
    // Try fetching from the default collection first, fall back to slug-based approach
    const res = await fetch(
      `${STOREFRONT_BASE}/v1/collections/all/products?storefront_token=${TOKEN}&currency=CAD`,
      { next: { revalidate: 300 } }, // cache 5 min
    )

    if (!res.ok) {
      // Some stores don't have an "all" collection — try listing via collections
      const collectionsRes = await fetch(
        `${STOREFRONT_BASE}/v1/collections?storefront_token=${TOKEN}`,
        { next: { revalidate: 300 } },
      )
      if (!collectionsRes.ok) {
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 502 })
      }
      const collectionsData = await collectionsRes.json()
      const collections: Array<{ slug: string }> = collectionsData.results ?? collectionsData ?? []

      // Fetch products from all collections and deduplicate
      const allProducts: FWProduct[] = []
      const seen = new Set<string>()
      for (const col of collections) {
        const colRes = await fetch(
          `${STOREFRONT_BASE}/v1/collections/${col.slug}/products?storefront_token=${TOKEN}&currency=CAD`,
          { next: { revalidate: 300 } },
        )
        if (colRes.ok) {
          const data = await colRes.json()
          const products: FWProduct[] = data.results ?? data ?? []
          for (const p of products) {
            if (!seen.has(p.id)) {
              seen.add(p.id)
              allProducts.push(p)
            }
          }
        }
      }
      return NextResponse.json(allProducts)
    }

    const data = await res.json()
    const products: FWProduct[] = data.results ?? data ?? []
    return NextResponse.json(products)
  } catch (err) {
    console.error('[shop/products]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
