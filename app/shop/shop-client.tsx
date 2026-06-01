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

function detectCity(name: string): string {
  const cities = ['Edmonton', 'Calgary', 'Lethbridge', 'Medicine Hat', 'Red Deer', 'Grande Prairie']
  return cities.find(c => name.toLowerCase().includes(c.toLowerCase())) ?? 'Alberta'
}

function buildCheckoutUrl(items: CartItem[]): string {
  if (!items.length) return STORE_DOMAIN
  const products = items.map(i => `${i.variant.id}:${i.quantity}`).join(',')
  return `${STORE_DOMAIN}/cart/checkout?products=${products}&currency=CAD`
}

// ─── Product image ────────────────────────────────────────────────────────────

function ProductImage({
  product,
  fill = false,
}: {
  product: FWProduct
  fill?: boolean
}) {
  const src = product.images?.[0]?.url
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={product.name}
        className={fill ? 'absolute inset-0 h-full w-full object-cover' : 'h-full w-full object-cover'}
        loading="lazy"
      />
    )
  }
  // Fallback placeholder when no photo available
  return (
    <div className={`flex items-center justify-center bg-neutral-100 ${fill ? 'absolute inset-0' : 'h-full w-full'}`}>
      <span className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
        {detectCity(product.name)}
      </span>
    </div>
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
  const price = getProductPrice(product)
  const currency = getProductCurrency(product)

  return (
    <article className="group">
      <button
        onClick={() => onQuickView(product)}
        className="relative block w-full overflow-hidden bg-neutral-100 text-left focus:outline-none"
        style={{ aspectRatio: '3/4' }}
        aria-label={`View ${product.name}`}
      >
        <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.03]">
          <ProductImage product={product} fill />
        </div>
      </button>

      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">{city}</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-black">{product.name}</p>
          <p className="mt-0.5 text-sm text-neutral-500">{formatPrice(price, currency)}</p>
        </div>
        <button
          onClick={() => onAdd(product)}
          className="mt-[18px] shrink-0 h-8 border border-black px-3 text-[10px] font-bold uppercase tracking-[0.12em] transition hover:bg-black hover:text-white"
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
    <div className="fixed inset-0 z-50 bg-black/40" role="dialog" aria-modal="true">
      <aside className="ml-auto flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <h2 className="text-base font-bold">Cart</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center border border-neutral-200 transition hover:bg-black hover:text-white"
            aria-label="Close cart"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="py-12 text-center">
              <ShoppingBag className="mx-auto h-8 w-8 text-neutral-300" />
              <p className="mt-3 text-sm text-neutral-400">Your cart is empty.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {items.map(item => (
                <div key={`${item.product.id}-${item.variant.id}`} className="grid grid-cols-[72px_1fr] gap-4">
                  <div className="relative aspect-square overflow-hidden bg-neutral-100">
                    <ProductImage product={item.product} fill />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                      {detectCity(item.product.name)}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold leading-tight">{item.product.name}</p>
                    <p className="mt-0.5 text-xs text-neutral-500">{item.variant.name}</p>
                    <p className="mt-1 text-sm text-neutral-600">
                      {formatPrice(item.variant.unitPrice.value, item.variant.unitPrice.currency)}
                    </p>
                    <div className="mt-2.5 inline-flex h-8 items-center border border-neutral-200">
                      <button
                        onClick={() => onDecrement(item)}
                        className="flex h-full w-8 items-center justify-center transition hover:bg-black hover:text-white"
                        aria-label="Decrease"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-9 text-center text-sm">{item.quantity}</span>
                      <button
                        onClick={() => onIncrement(item)}
                        className="flex h-full w-8 items-center justify-center transition hover:bg-black hover:text-white"
                        aria-label="Increase"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-neutral-100 p-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-neutral-500">Subtotal</span>
            <span className="text-sm font-bold">{formatPrice(subtotal, currency)}</span>
          </div>
          <a
            href={checkoutUrl}
            className="flex h-11 w-full items-center justify-center gap-2 bg-black text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-neutral-800"
          >
            Checkout
            <ArrowRight className="h-4 w-4" />
          </a>
          <p className="mt-2.5 text-center text-[10px] text-neutral-400">
            Secure checkout via Fourthwall
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
  const [selectedVariant, setSelectedVariant] = useState<FWVariant>(product.variants[0])

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-white" role="dialog" aria-modal="true">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 lg:grid-cols-2">
        {/* Photo */}
        <div className="relative min-h-[320px] bg-neutral-100 lg:min-h-screen">
          <button
            onClick={onClose}
            className="absolute left-4 top-4 z-10 flex h-9 w-9 items-center justify-center bg-white shadow-sm transition hover:bg-neutral-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="h-full">
            <ProductImage product={product} fill />
          </div>
        </div>

        {/* Details */}
        <aside className="flex flex-col justify-center px-6 py-10 sm:px-12">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-400">{city}</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">{product.name}</h2>

          <p className="mt-3 text-2xl font-bold">
            {formatPrice(selectedVariant.unitPrice.value, selectedVariant.unitPrice.currency)}
          </p>

          {product.description && (
            <p className="mt-4 text-sm leading-7 text-neutral-500">{product.description}</p>
          )}

          {product.variants.length > 1 && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">Size</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map(v => {
                  const inStock =
                    v.stock.type === 'UNLIMITED' || (v.stock.inStock != null && v.stock.inStock > 0)
                  return (
                    <button
                      key={v.id}
                      onClick={() => inStock && setSelectedVariant(v)}
                      disabled={!inStock}
                      className={`h-10 min-w-[48px] border px-3 text-sm font-semibold transition ${
                        selectedVariant.id === v.id
                          ? 'border-black bg-black text-white'
                          : inStock
                          ? 'border-neutral-200 hover:border-black'
                          : 'cursor-not-allowed border-neutral-100 text-neutral-300 line-through'
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
            className="mt-8 flex h-11 w-full items-center justify-center gap-2 bg-black text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-neutral-800"
          >
            <ShoppingBag className="h-4 w-4" />
            Add to cart
          </button>

          <div className="mt-6 space-y-2 text-sm text-neutral-500">
            {[
              'Made on demand — printed after your order',
              'Secure checkout via Fourthwall',
              'Shipped across Canada',
            ].map(item => (
              <p key={item} className="flex gap-2">
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

const ALL_CITIES = [
  'All',
  'Edmonton',
  'Calgary',
  'Lethbridge',
  'Medicine Hat',
  'Red Deer',
  'Grande Prairie',
  'Alberta',
] as const

export function ShopClient({ initialCity = 'All' }: { initialCity?: string }) {
  const [products, setProducts] = useState<FWProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [city, setCity] = useState<string>(initialCity)
  const [activeProduct, setActiveProduct] = useState<FWProduct | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])

  useEffect(() => {
    fetch('/api/shop/products')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load products')
        return res.json()
      })
      .then((data: FWProduct[]) => {
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

  const activeCities = useMemo(() => {
    const citySet = new Set(products.map(p => detectCity(p.name)))
    return ALL_CITIES.filter(c => c === 'All' || citySet.has(c))
  }, [products])

  return (
    <main className="min-h-screen bg-white text-black">
      {/* Announcement bar */}
      <div className="bg-black px-4 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
        Made on demand · Shipped across Canada
      </div>

      {/* Page header */}
      <header className="border-b border-neutral-100 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-neutral-400">
            Culture Alberta
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Shop</h1>
        </div>
      </header>

      {/* Sticky filter + cart bar */}
      <div className="sticky top-0 z-30 border-b border-neutral-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {activeCities.map(option => (
              <button
                key={option}
                onClick={() => setCity(option)}
                className={`shrink-0 h-12 border-b-2 px-3 text-xs font-semibold uppercase tracking-[0.12em] whitespace-nowrap transition ${
                  city === option
                    ? 'border-black text-black'
                    : 'border-transparent text-neutral-400 hover:text-black'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className="relative shrink-0 flex h-8 items-center gap-1.5 border border-neutral-200 px-3 text-xs font-semibold text-black transition hover:bg-black hover:text-white hover:border-black"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            {cartCount > 0 ? `Cart (${cartCount})` : 'Cart'}
          </button>
        </div>
      </div>

      {/* Product grid */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-300" />
          </div>
        ) : error ? (
          <div className="py-20 text-center">
            <p className="text-sm text-neutral-400">{error}</p>
          </div>
        ) : filtered.length > 0 ? (
          <>
            <p className="mb-6 text-xs text-neutral-400">
              {filtered.length} {filtered.length === 1 ? 'product' : 'products'}
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAdd={p => addToCart(p)}
                  onQuickView={setActiveProduct}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="py-20 text-center">
            <p className="text-sm text-neutral-400">No products yet for {city}.</p>
            <button
              onClick={() => setCity('All')}
              className="mt-3 text-xs font-semibold underline"
            >
              View all
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
