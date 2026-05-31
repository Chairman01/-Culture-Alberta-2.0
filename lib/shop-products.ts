export type ShopProduct = {
  id: string
  slug: string
  city: 'Alberta' | 'Calgary' | 'Edmonton' | 'Lethbridge' | 'Grande Prairie' | 'Medicine Hat' | 'Red Deer'
  name: string
  type: 'Hoodie' | 'T-Shirt'
  price: number
  compareAt?: number
  colour: string
  accent: string
  tag: string
  description: string
  seoTitle: string
  seoDescription: string
  keywords: string[]
  variantId?: string
}

export const FOURTHWALL_STORE_DOMAIN =
  (process.env.NEXT_PUBLIC_FOURTHWALL_STORE_URL || 'https://culturemedia-shop.fourthwall.com/')
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')

export const CHECKOUT_DOMAIN =
  (process.env.NEXT_PUBLIC_FW_CHECKOUT || process.env.NEXT_PUBLIC_FOURTHWALL_CHECKOUT_DOMAIN || FOURTHWALL_STORE_DOMAIN)
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')

export const SHOP_PRODUCTS: ShopProduct[] = [
  {
    id: 'edmonton-forever-hoodie',
    slug: 'edmonton-hoodies',
    city: 'Edmonton',
    name: 'Edmonton Forever Hoodie',
    type: 'Hoodie',
    price: 68,
    compareAt: 78,
    colour: '#101010',
    accent: '#f4efe6',
    tag: 'City drop',
    description: 'A heavyweight Edmonton hoodie for people who carry the city with them.',
    seoTitle: 'Edmonton Hoodies | Edmonton Forever Merch by Culture Alberta',
    seoDescription: 'Shop Edmonton hoodies and Edmonton merch from Culture Alberta. Heavyweight city apparel designed in Alberta and made on demand.',
    keywords: ['Edmonton hoodies', 'Edmonton hoodie', 'Edmonton merch', 'Edmonton apparel', 'YEG hoodie'],
    variantId: process.env.NEXT_PUBLIC_FW_VARIANT_EDMONTON_HOODIE,
  },
  {
    id: 'calgary-forever-hoodie',
    slug: 'calgary-hoodies',
    city: 'Calgary',
    name: 'Calgary Forever Hoodie',
    type: 'Hoodie',
    price: 68,
    compareAt: 78,
    colour: '#151515',
    accent: '#f7f2e9',
    tag: 'City drop',
    description: 'A clean Calgary hoodie built for everyday wear, winter nights, and city pride.',
    seoTitle: 'Calgary Hoodies | Calgary Forever Merch by Culture Alberta',
    seoDescription: 'Shop Calgary hoodies and Calgary merch from Culture Alberta. Premium city apparel designed in Alberta and made on demand.',
    keywords: ['Calgary hoodies', 'Calgary hoodie', 'Calgary merch', 'Calgary apparel', 'YYC hoodie'],
    variantId: process.env.NEXT_PUBLIC_FW_VARIANT_CALGARY_HOODIE,
  },
  {
    id: 'lethbridge-forever-hoodie',
    slug: 'lethbridge-hoodies',
    city: 'Lethbridge',
    name: 'Lethbridge Forever Hoodie',
    type: 'Hoodie',
    price: 68,
    compareAt: 78,
    colour: '#0e0e1a',
    accent: '#e2d9c8',
    tag: 'City drop',
    description: 'A heavyweight Lethbridge hoodie built for coulees, cold nights, and Southern Alberta pride.',
    seoTitle: 'Lethbridge Hoodies | Lethbridge Forever Merch by Culture Alberta',
    seoDescription: 'Shop Lethbridge hoodies and Lethbridge merch from Culture Alberta. Premium city apparel designed in Alberta and made on demand.',
    keywords: ['Lethbridge hoodies', 'Lethbridge hoodie', 'Lethbridge merch', 'Lethbridge apparel', 'YQL hoodie'],
    variantId: process.env.NEXT_PUBLIC_FW_VARIANT_LETHBRIDGE_HOODIE,
  },
  {
    id: 'medicine-hat-forever-hoodie',
    slug: 'medicine-hat-hoodies',
    city: 'Medicine Hat',
    name: 'Medicine Hat Forever Hoodie',
    type: 'Hoodie',
    price: 68,
    compareAt: 78,
    colour: '#160a08',
    accent: '#ecdcc8',
    tag: 'City drop',
    description: 'A bold Medicine Hat hoodie for the city with the most sunshine in Canada.',
    seoTitle: 'Medicine Hat Hoodies | Medicine Hat Forever Merch by Culture Alberta',
    seoDescription: 'Shop Medicine Hat hoodies and Medicine Hat merch from Culture Alberta. Premium city apparel designed in Alberta and made on demand.',
    keywords: ['Medicine Hat hoodies', 'Medicine Hat hoodie', 'Medicine Hat merch', 'Medicine Hat apparel'],
    variantId: process.env.NEXT_PUBLIC_FW_VARIANT_MEDICINE_HAT_HOODIE,
  },
  {
    id: 'red-deer-forever-hoodie',
    slug: 'red-deer-hoodies',
    city: 'Red Deer',
    name: 'Red Deer Forever Hoodie',
    type: 'Hoodie',
    price: 68,
    compareAt: 78,
    colour: '#120d0d',
    accent: '#f0e4e4',
    tag: 'City drop',
    description: 'A clean Red Deer hoodie for Central Alberta pride, wherever you roam.',
    seoTitle: 'Red Deer Hoodies | Red Deer Forever Merch by Culture Alberta',
    seoDescription: 'Shop Red Deer hoodies and Red Deer merch from Culture Alberta. Premium city apparel designed in Alberta and made on demand.',
    keywords: ['Red Deer hoodies', 'Red Deer hoodie', 'Red Deer merch', 'Red Deer apparel', 'YQF hoodie'],
    variantId: process.env.NEXT_PUBLIC_FW_VARIANT_RED_DEER_HOODIE,
  },
  {
    id: 'grande-prairie-forever-hoodie',
    slug: 'grande-prairie-hoodies',
    city: 'Grande Prairie',
    name: 'Grande Prairie Forever Hoodie',
    type: 'Hoodie',
    price: 68,
    compareAt: 78,
    colour: '#0a1208',
    accent: '#d8e8d0',
    tag: 'City drop',
    description: 'A heavyweight Grande Prairie hoodie for the city that built Northern Alberta.',
    seoTitle: 'Grande Prairie Hoodies | Grande Prairie Forever Merch by Culture Alberta',
    seoDescription: 'Shop Grande Prairie hoodies and Grande Prairie merch from Culture Alberta. Premium city apparel designed in Alberta and made on demand.',
    keywords: ['Grande Prairie hoodies', 'Grande Prairie hoodie', 'Grande Prairie merch', 'Grande Prairie apparel', 'YQU hoodie'],
    variantId: process.env.NEXT_PUBLIC_FW_VARIANT_GRANDE_PRAIRIE_HOODIE,
  },
  {
    id: 'alberta-forever-hoodie',
    slug: 'alberta-hoodies',
    city: 'Alberta',
    name: 'Alberta Forever Hoodie',
    type: 'Hoodie',
    price: 68,
    compareAt: 78,
    colour: '#111111',
    accent: '#f3f0e8',
    tag: 'Province drop',
    description: 'A province-wide Alberta hoodie for weekends, road trips, and hometown pride.',
    seoTitle: 'Alberta Hoodies | Alberta Forever Merch by Culture Alberta',
    seoDescription: 'Shop Alberta hoodies and Alberta merch from Culture Alberta. Premium apparel celebrating Alberta cities, culture, and local pride.',
    keywords: ['Alberta hoodies', 'Alberta hoodie', 'Alberta merch', 'Alberta apparel', 'Alberta clothing'],
    variantId: process.env.NEXT_PUBLIC_FW_VARIANT_ALBERTA_HOODIE,
  },
]

export const SHOP_CITIES = ['All', 'Edmonton', 'Calgary', 'Lethbridge', 'Medicine Hat', 'Red Deer', 'Grande Prairie', 'Alberta'] as const

export function getProductBySlug(slug: string) {
  return SHOP_PRODUCTS.find(product => product.slug === slug)
}

export function buildDirectCheckoutUrl(items: Array<{ variantId?: string; quantity: number }>) {
  if (!items.length || items.some(item => !item.variantId)) {
    return `https://${FOURTHWALL_STORE_DOMAIN}`
  }

  const products = items
    .map(item => `${item.variantId}:${item.quantity}`)
    .join(',')

  const params = new URLSearchParams({
    products,
    currency: 'CAD',
  })

  return `https://${CHECKOUT_DOMAIN}/cart/checkout?${params.toString()}`
}
