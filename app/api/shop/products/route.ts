import { NextResponse } from 'next/server'

const STOREFRONT_BASE = 'https://storefront-api.fourthwall.com'
const TOKEN = process.env.FOURTHWALL_STOREFRONT_TOKEN

export interface FWVariant {
  id: string
  /** Simplified display label — just the size (e.g. "S", "M", "XL") */
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

// Extract a clean size label from a raw Fourthwall variant
function sizeLabel(raw: {
  name: string
  attributes?: { size?: { name?: string }; description?: string }
}): string {
  if (raw.attributes?.size?.name) return raw.attributes.size.name
  if (raw.attributes?.description) {
    // e.g. "Black, XL" → "XL"
    const parts = raw.attributes.description.split(',')
    const last = parts[parts.length - 1].trim()
    if (last) return last
  }
  // Fallback: strip product name prefix "Product Name - Color, Size" → "Size"
  const parts = raw.name.split(',')
  if (parts.length > 1) return parts[parts.length - 1].trim()
  return raw.name
}

function transformProducts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  results: any[],
): FWProduct[] {
  return results.map(p => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description ?? '',
    images: p.images ?? [],
    variants: (p.variants ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (v: any): FWVariant => ({
        id: v.id,
        name: sizeLabel(v),
        sku: v.sku ?? '',
        unitPrice: v.unitPrice,
        stock: {
          type: v.stock?.type ?? 'UNLIMITED',
          inStock: v.stock?.inStock,
        },
      }),
    ),
  }))
}

export async function GET() {
  if (!TOKEN) {
    return NextResponse.json({ error: 'Storefront token not configured' }, { status: 503 })
  }

  try {
    const res = await fetch(
      `${STOREFRONT_BASE}/v1/collections/all/products?storefront_token=${TOKEN}&currency=CAD&pageSize=50`,
      { next: { revalidate: 300 } },
    )

    if (!res.ok) {
      // Fall back: enumerate all collections and deduplicate
      const collectionsRes = await fetch(
        `${STOREFRONT_BASE}/v1/collections?storefront_token=${TOKEN}`,
        { next: { revalidate: 300 } },
      )
      if (!collectionsRes.ok) {
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 502 })
      }
      const collectionsData = await collectionsRes.json()
      const collections: Array<{ slug: string }> = collectionsData.results ?? []

      const allProducts: FWProduct[] = []
      const seen = new Set<string>()
      for (const col of collections) {
        const colRes = await fetch(
          `${STOREFRONT_BASE}/v1/collections/${col.slug}/products?storefront_token=${TOKEN}&currency=CAD&pageSize=50`,
          { next: { revalidate: 300 } },
        )
        if (colRes.ok) {
          const data = await colRes.json()
          for (const p of transformProducts(data.results ?? [])) {
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
    return NextResponse.json(transformProducts(data.results ?? []))
  } catch (err) {
    console.error('[shop/products]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
