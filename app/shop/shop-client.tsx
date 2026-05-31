'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Minus, Plus, ShoppingBag, X, Check, Loader2 } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type FWVariant = {
  id: string
  name: string
  unitPrice: { value: number; currency: string }
  stock: { type: 'LIMITED' | 'UNLIMITED'; inStock?: number }
}

type FWProduct = {
  id: string
  name: string
  slug: string
  description: string
  variants: FWVariant[]
  images?: Array<{ url: string }>
}

type CartItem = {
  product: FWProduct
  variant: FWVariant
  quantity: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STORE_DOMAIN = (
  process.env.NEXT_PUBLIC_FOURTHWALL_STORE_URL || 'https://culturemedia-shop.fourthwall.com'
).replace(/\/$/, '')

function formatPrice(value: number, currency = 'CAD') {
  return `$${value.toFixed(2)} ${currency}`
}

function getProductPrice(product: FWProduct): number {
  return product.variants[0]?.unitPrice.value ?? 0
}

function getProductCurrency(product: FWProduct): string {
  return product.variants[0]?.unitPrice.currency ?? 'CAD'
}

function isAvailable(product: FWProduct): boolean {
  return product.variants.some(
    v => v.stock.type === 'UNLIMITED' || (v.stock.inStock != null && v.stock.inStock > 0),
  )
}

/** Detect city from product name */
function detectCity(name: string): string {
  const cities = ['Edmonton', 'Calgary', 'Lethbridge', 'Medicine Hat', 'Red Deer', 'Grande Prairie']
  return cities.find(c => name.toLowerCase().includes(c.toLowerCase())) ?? 'Alberta'
}

function buildCheckoutUrl(items: CartItem[]): string {
  if (!items.length) return STORE_DOMAIN
  const products = items.map(i => `${i.variant.id}:${i.quantity}`).join(',')
  return `${STORE_DOMAIN}/cart/checkout?products=${products}&currency=CAD`
}

// ─── Colour palette per city ──────────────────────────────────────────────────

const CITY_PALETTE: Record<string, { colour: string; accent: string }> = {
  Edmonton:        { colour: '#101010', accent: '#f4efe6' },
  Calgary:         { colour: '#151515', accent: '#f7f2e9' },
  Lethbridge:      { colour: '#0e0e1a', accent: '#e2d9c8' },
  'Medicine Hat':  { colour: '#160a08', accent: '#ecdcc8' },
  'Red Deer':      { colour: '#120d0d', accent: '#f0e4e4' },
  'Grande Prairie':{ colour: '#0a1208', accent: '#d8e8d0' },
  Alberta:         { colour: '#111111', accent: '#f3f0e8' },
}

function getPalette(city: string) {
  return CITY_PALETTE[city] ?? { colour: '#111111', accent: '#f0ede6' }
}

function getCityTextProps(city: string): { fontSize: number; letterSpacing: number } {
  const len = city.length
  if (len <= 7)  return { fontSize: 34, letterSpacing: 3 }
  if (len <= 8)  return { fontSize: 28, letterSpacing: 2 }
  if (len <= 10) return { fontSize: 24, letterSpacing: 2 }
  if (len <= 11) return { fontSize: 21, letterSpacing: 1 }
  return { fontSize: 17, letterSpacing: 1 }
}

// ─── Hoodie SVG mockup ────────────────────────────────────────────────────────

function HoodieMockup({ product }: { product: FWProduct }) {
  const city = detectCity(product.name)
  const { colour, accent } = getPalette(city)
  const { fontSize, letterSpacing } = getCityTextProps(city)

  return (
    <svg viewBox="0 0 640 760" className="h-full w-full" role="img" aria-label={`${product.name} preview`}>
      <defs>
        <filter id={`shadow-${product.id}`} x="-20%" y="-10%" width="140%" height="130%">
          <feDropShadow dx="0" dy="20" stdDeviation="18" floodOpacity="0.14" />
        </filter>
        <linearGradient id={`cloth-${product.id}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#252525" />
          <stop offset="0.48" stopColor={colour} />
          <stop offset="1" stopColor="#050505" />
        </linearGradient>
      </defs>
      <g filter={`url(#shadow-${product.id})`}>
        <path d="M205 193 C191 118 233 55 320 55 C407 55 449 118 435 193 C401 171 365 160 320 160 C275 160 239 171 205 193 Z" fill={`url(#cloth-${product.id})`} />
        <path d="M198 184 L105 237 L62 370 L116 389 L139 318 L139 680 L501 680 L501 318 L524 389 L578 370 L535 237 L442 184 C416 216 376 234 320 236 C264 234 224 216 198 184 Z" fill={`url(#cloth-${product.id})`} />
        <ellipse cx="320" cy="188" rx="91" ry="45" fill="#070707" opacity="0.92" />
        <path d="M224 190 C247 171 282 160 320 160 C358 160 393 171 416 190" fill="none" stroke="#292929" strokeWidth="7" strokeLinecap="round" />
        <path d="M286 190 C281 239 273 288 262 338" stroke="#282828" strokeWidth="5" strokeLinecap="round" />
        <path d="M354 190 C359 239 367 288 378 338" stroke="#282828" strokeWidth="5" strokeLinecap="round" />
        <path d="M221 498 C222 469 244 455 278 455 L362 455 C396 455 418 469 419 498 L419 602 L221 602 Z" fill="#080808" opacity="0.55" />
        <path d="M139 661 L501 661 L501 690 L139 690 Z" fill="#080808" opacity="0.75" />
      </g>
      <g fill={accent} textAnchor="middle">
        <text x="320" y="350" fontFamily="Arial, Helvetica, sans-serif" fontSize="13" fontWeight="700" letterSpacing="8" opacity="0.35">
          CULTURE ALBERTA
        </text>
        <text x="320" y="416" fontFamily="Georgia, 'Times New Roman', serif" fontSize={fontSize} fontWeight="900" letterSpacing={letterSpacing}>
          {city.toUpperCase()}
        </text>
        <text x="320" y="472" fontFamily="Georgia, 'Times New Roman', serif" fontSize="48" fontWeight="900" letterSpacing="8">
          FOREVER
        </text>
      </g>
    </svg>
  )
}

// ─── Product card ─────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onAdd,
  onQuickView,
}: {
  product: FWProduct
  onAdd: (p: FWProduct) => void
  onQuickView: (p: FWProduct) => void
}) {
  const city = detectCity(product.name)
  const { colour, accent } = getPalette(city)
  const price = getProductPrice(product)
  const currency = getProductCurrency(product)

  return (
    <article className="group">
      <button
        onClick={() => onQuickView(product)}
        className="relative w-full overflow-hidden text-left focus:outline-none"
        style={{ aspectRatio: '3/4' }}
        aria-label={`Quick view ${product.name}`}
      >
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(150deg, #242424 0%, ${colour} 55%, #070707 100%)` }}
        />
        <span
          className="absolute left-3 top-3 z-10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em]"
          style={{ backgroundColor: accent, color: '#111' }}
        >
          {city}
        </span>
        <div className="relative h-full transition-transform duration-500 group-hover:scale-[1.04]">
          <HoodieMockup product={product} />
        </div>
      </button>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.24em] text-black/40">{city}</p>
          <p className="mt-0.5 text-[15px] font-black leading-snug tracking-tight text-black">
            {product.name}
          </p>
          <p className="mt-1 text-sm font-bold text-black">{formatPrice(price, currency)}</p>
        </div>
        <button
          onClick={() => onAdd(product)}
          className="mt-[18px] h-9 shrink-0 px-4 bg-black text-white text-[10px] font-black uppercase tracking-[0.16em] transition hover:bg-neutral-800"
        >
          Add
        </button>
      </div>
    </article>
  )
}

// ─── Cart drawer ──────────────────────────────────────────────────────────────

function CartDrawer({
  items,
  onClose,
  onIncrement,
  onDecrement,
}: {
  items: CartItem[]
  onClose: () => void
  onIncrement: (item: CartItem) => void
  onDecrement: (item: CartItem) => void
}) {
  const subtotal = items.reduce((s, i) => s + i.variant.unitPrice.value * i.quantity, 0)
  const currency = items[0]?.variant.unitPrice.currency ?? 'CAD'
  const checkoutUrl = buildCheckoutUrl(items)

  return (
    <div className="fixed inset-0 z-50 bg-black/50" role="dialog" aria-modal="true">
      <aside className="ml-auto flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-black/40">Culture Alberta</p>
            <h2 className="text-xl font-black">Your Cart</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center border border-black/10 transition hover:bg-black hover:text-white"
            aria-label="Close cart"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="py-12 text-center">
              <ShoppingBag className="mx-auto h-10 w-10 text-black/20" />
              <p className="mt-3 text-sm text-black/45">Your cart is empty.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {items.map(item => {
                const city = detectCity(item.product.name)
                const { colour } = getPalette(city)
                return (
                  <div key={`${item.product.id}-${item.variant.id}`} className="grid grid-cols-[84px_1fr] gap-4">
                    <div
                      className="aspect-square p-1.5"
                      style={{ background: `linear-gradient(150deg, #242424, ${colour}, #070707)` }}
                    >
                      <HoodieMockup product={item.product} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-black/40">{city}</p>
                      <p className="mt-0.5 font-black leading-tight">{item.product.name}</p>
                      <p className="mt-0.5 text-xs text-black/50">{item.variant.name}</p>
                      <p className="mt-1 text-sm text-black/55">
                        {formatPrice(item.variant.unitPrice.value, item.variant.unitPrice.currency)}
                      </p>
                      <div className="mt-3 inline-flex h-9 items-center border border-black/15">
                        <button
                          onClick={() => onDecrement(item)}
                          className="flex h-full w-9 items-center justify-center transition hover:bg-black hover:text-white"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-10 text-center text-sm font-bold">{item.quantity}</span>
                        <button
                          onClick={() => onIncrement(item)}
                          className="flex h-full w-9 items-center justify-center transition hover:bg-black hover:text-white"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="border-t border-black/10 p-5">
          <div className="mb-4 flex items-center justify-between text-sm">
            <span className="text-black/55">Subtotal</span>
            <span className="font-black">{formatPrice(subtotal, currency)}</span>
          </div>
          <a
            href={checkoutUrl}
            className="flex h-12 w-full items-center justify-center gap-2 bg-black px-5 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-neutral-800"
          >
            Checkout
            <ArrowRight className="h-4 w-4" />
          </a>
          <p className="mt-3 text-center text-[10px] text-black/35">
            Secure checkout powered by Fourthwall
          </p>
        </div>
      </aside>
    </div>
  )
}

// ─── Product modal ────────────────────────────────────────────────────────────

function ProductModal({
  product,
  onClose,
  onAdd,
}: {
  product: FWProduct
  onClose: () => void
  onAdd: (p: FWProduct, v: FWVariant) => void
}) {
  const city = detectCity(product.name)
  const { colour, accent } = getPalette(city)
  const [selectedVariant, setSelectedVariant] = useState<FWVariant>(product.variants[0])

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-white" role="dialog" aria-modal="true">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-2">
        <div
          className="relative flex items-center justify-center p-8 sm:p-14"
          style={{ background: `linear-gradient(150deg, #1e1e1e 0%, ${colour} 50%, #070707 100%)` }}
        >
          <button
            onClick={onClose}
            className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center bg-white/10 text-white transition hover:bg-white hover:text-black"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="w-full max-w-sm">
            <HoodieMockup product={product} />
          </div>
        </div>

        <aside className="flex flex-col justify-center px-6 py-10 sm:px-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-black/35">{city} merch</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight">{product.name}</h2>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="text-2xl font-black">
              {formatPrice(selectedVariant.unitPrice.value, selectedVariant.unitPrice.currency)}
            </span>
            <span
              className="px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em]"
              style={{ backgroundColor: accent, color: '#111' }}
            >
              City drop
            </span>
          </div>

          {product.description && (
            <p className="mt-5 leading-7 text-black/60">{product.description}</p>
          )}

          {/* Variant / size selector */}
          {product.variants.length > 1 && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-black/40">Select size</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map(v => {
                  const inStock =
                    v.stock.type === 'UNLIMITED' || (v.stock.inStock != null && v.stock.inStock > 0)
                  return (
                    <button
                      key={v.id}
                      onClick={() => inStock && setSelectedVariant(v)}
                      disabled={!inStock}
                      className={`h-11 min-w-[52px] px-3 border text-sm font-bold transition ${
                        selectedVariant.id === v.id
                          ? 'border-black bg-black text-white'
                          : inStock
                          ? 'border-black/15 hover:border-black'
                          : 'border-black/10 text-black/25 cursor-not-allowed line-through'
                      }`}
                    >
                      {v.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <button
            onClick={() => {
              onAdd(product, selectedVariant)
              onClose()
            }}
            className="mt-7 flex h-12 w-full items-center justify-center gap-2 bg-black px-5 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-neutral-800"
          >
            <ShoppingBag className="h-4 w-4" />
            Add to cart
          </button>

          <div className="mt-7 space-y-2.5 text-sm text-black/60">
            {[
              'Made on demand — printed after your order',
              'Secure checkout powered by Fourthwall',
              'Shipped across Canada',
            ].map(item => (
              <p key={item} className="flex gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-black" />
                {item}
              </p>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}

// ─── Main shop component ──────────────────────────────────────────────────────

const ALL_CITIES = ['All', 'Edmonton', 'Calgary', 'Lethbridge', 'Medicine Hat', 'Red Deer', 'Grande Prairie', 'Alberta'] as const

export function ShopClient({ initialCity = 'All' }: { initialCity?: string }) {
  const [products, setProducts] = useState<FWProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [city, setCity] = useState<string>(initialCity)
  const [activeProduct, setActiveProduct] = useState<FWProduct | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])

  // Fetch live products from Fourthwall via our API route
  useEffect(() => {
    fetch('/api/shop/products')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load products')
        return res.json()
      })
      .then((data: FWProduct[]) => {
        // Only show products that have at least one available variant
        setProducts(data.filter(isAvailable))
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setError('Could not load products right now.')
        setLoading(false)
      })
  }, [])

  const filtered = useMemo(() => {
    if (city === 'All') return products
    return products.filter(p => detectCity(p.name) === city)
  }, [products, city])

  const addToCart = (product: FWProduct, variant?: FWVariant) => {
    const v = variant ?? product.variants[0]
    setCart(items => {
      const existing = items.find(i => i.product.id === product.id && i.variant.id === v.id)
      if (existing) {
        return items.map(i =>
          i.product.id === product.id && i.variant.id === v.id
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        )
      }
      return [...items, { product, variant: v, quantity: 1 }]
    })
    setCartOpen(true)
  }

  const decrementCart = (item: CartItem) => {
    setCart(items =>
      items.flatMap(i => {
        if (i.product.id !== item.product.id || i.variant.id !== item.variant.id) return [i]
        if (i.quantity <= 1) return []
        return [{ ...i, quantity: i.quantity - 1 }]
      }),
    )
  }

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)

  // Detect which city filters are actually populated
  const activeCities = useMemo(() => {
    const citySet = new Set(products.map(p => detectCity(p.name)))
    return ALL_CITIES.filter(c => c === 'All' || citySet.has(c))
  }, [products])

  return (
    <main className="min-h-screen bg-white text-black">
      {/* Announcement bar */}
      <div className="bg-black px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-[0.24em] text-white/70">
        Edmonton · Calgary · Lethbridge · Medicine Hat · Red Deer · Grande Prairie · Made on demand
      </div>

      {/* Hero */}
      <section className="bg-[#0e0e0e] text-white">
        <div className="mx-auto grid max-w-7xl lg:grid-cols-[1fr_420px]">
          <div className="flex flex-col justify-center px-6 py-16 sm:px-10 sm:py-24">
            <p className="text-[10px] font-bold uppercase tracking-[0.55em] text-white/30">
              Culture Alberta Shop
            </p>
            <h1 className="mt-4 max-w-2xl text-5xl font-black leading-[1.02] tracking-tight sm:text-6xl">
              Alberta merch for every city.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-white/50">
              Premium hoodies for Edmonton, Calgary, Lethbridge, Medicine Hat, Red Deer, and Grande
              Prairie. Made on demand, shipped across Canada.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {(['Edmonton', 'Calgary', 'Lethbridge', 'Medicine Hat', 'Red Deer', 'Grande Prairie'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setCity(c)}
                  className={`h-9 px-4 text-xs font-black uppercase tracking-[0.14em] border transition ${
                    city === c
                      ? 'border-white bg-white text-black'
                      : 'border-white/20 text-white/60 hover:border-white/60 hover:text-white'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          {/* Featured hoodie — first product loaded */}
          <div className="flex items-center justify-center bg-[#161616] p-6 sm:p-10 lg:p-8">
            {products[0] ? (
              <div className="mx-auto w-full max-w-[280px]">
                <HoodieMockup product={products[0]} />
              </div>
            ) : (
              <div className="h-64 w-64" />
            )}
          </div>
        </div>
      </section>

      {/* Sticky filter + cart bar */}
      <div className="sticky top-0 z-30 border-b border-black/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {activeCities.map(option => (
              <button
                key={option}
                onClick={() => setCity(option)}
                className={`shrink-0 h-9 px-3.5 text-[10px] font-black uppercase tracking-[0.14em] whitespace-nowrap transition ${
                  city === option
                    ? 'bg-black text-white'
                    : 'bg-black/[0.04] text-black/50 hover:bg-black/[0.08] hover:text-black'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className="relative shrink-0 flex h-9 items-center gap-2 bg-black px-4 text-[10px] font-black uppercase tracking-[0.14em] text-white transition hover:bg-neutral-800"
          >
            <ShoppingBag className="h-4 w-4" />
            Cart
            {cartCount > 0 && <span className="ml-0.5 text-white/70">({cartCount})</span>}
          </button>
        </div>
      </div>

      {/* Product grid */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <div className="mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-black/35">Latest arrivals</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight">
            {city === 'All' ? 'Shop every drop.' : `${city} merch.`}
          </h2>
          {!loading && (
            <p className="mt-1 text-sm text-black/40">
              {filtered.length} {filtered.length === 1 ? 'product' : 'products'}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-black/30" />
          </div>
        ) : error ? (
          <div className="py-20 text-center">
            <p className="text-sm text-black/45">{error}</p>
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={p => addToCart(p)}
                onQuickView={setActiveProduct}
              />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="text-sm text-black/45">No products yet for {city}.</p>
            <button onClick={() => setCity('All')} className="mt-4 text-sm font-bold underline">
              View all products
            </button>
          </div>
        )}
      </section>

      {activeProduct && (
        <ProductModal
          product={activeProduct}
          onClose={() => setActiveProduct(null)}
          onAdd={addToCart}
        />
      )}
      {cartOpen && (
        <CartDrawer
          items={cart}
          onClose={() => setCartOpen(false)}
          onIncrement={item => addToCart(item.product, item.variant)}
          onDecrement={decrementCart}
        />
      )}
    </main>
  )
}
