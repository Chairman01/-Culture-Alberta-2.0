import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export type FourthwallVariant = {
  id: string
  size: string
  price: number
  currency: string
  inStock: boolean
}

export async function GET(req: NextRequest) {
  const productSlug = req.nextUrl.searchParams.get('slug')
  if (!productSlug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
  }

  const token = process.env.FOURTHWALL_STOREFRONT_TOKEN
  if (!token) {
    return NextResponse.json({ variants: null })
  }

  try {
    const res = await fetch(
      `https://storefront-api.fourthwall.com/v1/collections/all/products?storefront_token=${token}&pageSize=50`,
      { next: { revalidate: 300 } },
    )
    if (!res.ok) {
      return NextResponse.json({ variants: null })
    }

    const data = await res.json()
    const product = (data.results ?? []).find(
      (p: { slug: string }) => p.slug === productSlug,
    )

    if (!product) {
      return NextResponse.json({ variants: null })
    }

    const variants: FourthwallVariant[] = product.variants.map(
      (v: {
        id: string
        attributes: { size?: { name: string }; description?: string }
        unitPrice: { value: number; currency: string }
        stock: { type: string; inStock?: number }
      }) => ({
        id: v.id,
        size: v.attributes.size?.name ?? v.attributes.description ?? 'One Size',
        price: v.unitPrice.value,
        currency: v.unitPrice.currency,
        inStock: v.stock.type === 'UNLIMITED' || (v.stock.inStock ?? 0) > 0,
      }),
    )

    return NextResponse.json({ variants, fourthwallProductId: product.id })
  } catch {
    return NextResponse.json({ variants: null })
  }
}
