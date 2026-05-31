'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowRight, Check, Minus, Plus, ShoppingBag, X } from 'lucide-react'

import { buildDirectCheckoutUrl, SHOP_CITIES, SHOP_PRODUCTS, ShopProduct } from '@/lib/shop-products'

type CartItem = {
  product: ShopProduct
  quantity: number
}

function formatPrice(value: number) {
  return `$${value.toFixed(2)} CAD`
}

function getCityTextProps(city: string): { fontSize: number; letterSpacing: number } {
  const len = city.length
  if (len <= 7) return { fontSize: 34, letterSpacing: 3 }
  if (len <= 8) return { fontSize: 28, letterSpacing: 2 }
  if (len <= 10) return { fontSize: 24, letterSpacing: 2 }
  if (len <= 11) return { fontSize: 21, letterSpacing: 1 }
  return { fontSize: 17, letterSpacing: 1 }
}

function HoodieMockup({ product }: { product: ShopProduct }) {
  const { fontSize, letterSpacing } = getCityTextProps(product.city)

  return (
    <svg viewBox="0 0 640 760" className="h-full w-full" role="img" aria-label={`${product.name} preview`}>
      <defs>
        <filter id={`shadow-${product.id}`} x="-20%" y="-10%" width="140%" height="130%">
          <feDropShadow dx="0" dy="20" stdDeviation="18" floodOpacity="0.14" />
        </filter>
        <linearGradient id={`cloth-${product.id}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#252525" />
          <stop offset="0.48" stopColor={product.colour} />
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
      <g fill={product.accent} textAnchor="middle">
        <text x="320" y="350" fontFamily="Arial, Helvetica, sans-serif" fontSize="13" fontWeight="700" letterSpacing="8" opacity="0.35">
          CULTURE ALBERTA
        </text>
        <text x="320" y="416" fontFamily="Georgia, 'Times New Roman', serif" fontSize={fontSize} fontWeight="900" letterSpacing={letterSpacing}>
          {product.city.toUpperCase()}
        </text>
        <text x="320" y="472" fontFamily="Georgia, 'Times New Roman', serif" fontSize="48" fontWeight="900" letterSpacing="8">
          FOREVER
        </text>
        <path d="M286 522 C303 498 337 498 354 522 C337 546 303 546 286 522 Z" fill="none" stroke={product.accent} strokeWidth="5" opacity="0.7" />
        <path d="M354 522 C371 498 405 498 422 522 C405 546 371 546 354 522 Z" fill="none" stroke={product.accent} strokeWidth="5" opacity="0.7" />
      </g>
    </svg>
  )
}

function ProductCard({
  product,
  onAdd,
  onQuickView,
}: {
  product: ShopProduct
  onAdd: (p: ShopProduct) => void
  onQuickView: (p: ShopProduct) => void
}) {
  return (
    <article className="group">
      <button
        onClick={() => onQuickView(product)}
        className="relative w-full overflow-hidden text-left focus:outline-none"
        style={{ aspectRatio: '3/4' }}
        aria-label={`Quick view ${product.name}`}
      >
        {/* Product colour background */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(150deg, #242424 0%, ${product.colour} 55%, #070707 100%)`,
          }}
        />
        {/* Tag badge */}
        <span
          className="absolute left-3 top-3 z-10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em]"
          style={{ backgroundColor: product.accent, color: '#111' }}
        >
          {product.tag}
        </span>
        {/* Hoodie mockup */}
        <div className="relative h-full transition-transform duration-500 group-hover:scale-[1.04]">
          <HoodieMockup product={product} />
        </div>
      </button>

      {/* Info row below card */}
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.24em] text-black/40">{product.city}</p>
          <Link
            href={`/shop/${product.slug}`}
            className="mt-0.5 block text-[15px] font-black leading-snug tracking-tight text-black hover:underline"
          >
            {product.name}
          </Link>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm font-bold text-black">{formatPrice(product.price)}</span>
            {product.compareAt && (
              <span className="text-xs text-black/35 line-through">{formatPrice(product.compareAt)}</span>
            )}
          </div>
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

function CartDrawer({
  items,
  onClose,
  onAdd,
  onRemove,
}: {
  items: CartItem[]
  onClose: () => void
  onAdd: (p: ShopProduct) => void
  onRemove: (p: ShopProduct) => void
}) {
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const checkoutUrl = buildDirectCheckoutUrl(
    items.map(item => ({ variantId: item.product.variantId, quantity: item.quantity })),
  )

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
              {items.map(item => (
                <div key={item.product.id} className="grid grid-cols-[84px_1fr] gap-4">
                  <div
                    className="aspect-square p-1.5"
                    style={{
                      background: `linear-gradient(150deg, #242424, ${item.product.colour}, #070707)`,
                    }}
                  >
                    <HoodieMockup product={item.product} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-black/40">
                      {item.product.city}
                    </p>
                    <p className="mt-0.5 font-black leading-tight">{item.product.name}</p>
                    <p className="mt-1 text-sm text-black/55">{formatPrice(item.product.price)}</p>
                    <div className="mt-3 inline-flex h-9 items-center border border-black/15">
                      <button
                        onClick={() => onRemove(item.product)}
                        className="flex h-full w-9 items-center justify-center transition hover:bg-black hover:text-white"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-10 text-center text-sm font-bold">{item.quantity}</span>
                      <button
                        onClick={() => onAdd(item.product)}
                        className="flex h-full w-9 items-center justify-center transition hover:bg-black hover:text-white"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-black/10 p-5">
          <div className="mb-4 flex items-center justify-between text-sm">
            <span className="text-black/55">Subtotal</span>
            <span className="font-black">{formatPrice(subtotal)}</span>
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

function ProductModal({
  product,
  onClose,
  onAdd,
}: {
  product: ShopProduct
  onClose: () => void
  onAdd: (p: ShopProduct) => void
}) {
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-white" role="dialog" aria-modal="true">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-2">
        {/* Left – hoodie on dark background */}
        <div
          className="relative flex items-center justify-center p-8 sm:p-14"
          style={{
            background: `linear-gradient(150deg, #1e1e1e 0%, ${product.colour} 50%, #070707 100%)`,
          }}
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

        {/* Right – product details */}
        <aside className="flex flex-col justify-center px-6 py-10 sm:px-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-black/35">{product.city} merch</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight">{product.name}</h2>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="text-2xl font-black">{formatPrice(product.price)}</span>
            {product.compareAt && (
              <span className="text-base text-black/35 line-through">{formatPrice(product.compareAt)}</span>
            )}
            <span
              className="px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em]"
              style={{ backgroundColor: product.accent, color: '#111' }}
            >
              {product.tag}
            </span>
          </div>

          <p className="mt-5 leading-7 text-black/60">{product.description}</p>

          <div className="mt-7 grid grid-cols-5 gap-2">
            {['S', 'M', 'L', 'XL', '2XL'].map(size => (
              <button
                key={size}
                className="h-11 border border-black/15 text-sm font-bold transition hover:border-black"
              >
                {size}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-black/40">Size selected at checkout</p>

          <button
            onClick={() => {
              onAdd(product)
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

export function ShopClient({ initialCity = 'All' }: { initialCity?: (typeof SHOP_CITIES)[number] }) {
  const [city, setCity] = useState<(typeof SHOP_CITIES)[number]>(initialCity)
  const [activeProduct, setActiveProduct] = useState<ShopProduct | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])

  const products = useMemo(
    () => SHOP_PRODUCTS.filter(p => city === 'All' || p.city === city),
    [city],
  )

  const addToCart = (product: ShopProduct) => {
    setCart(items => {
      const existing = items.find(item => item.product.id === product.id)
      if (existing) {
        return items.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        )
      }
      return [...items, { product, quantity: 1 }]
    })
    setCartOpen(true)
  }

  const removeFromCart = (product: ShopProduct) => {
    setCart(items =>
      items.flatMap(item => {
        if (item.product.id !== product.id) return [item]
        if (item.quantity <= 1) return []
        return [{ ...item, quantity: item.quantity - 1 }]
      }),
    )
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <main className="min-h-screen bg-white text-black">
      {/* Slim announcement bar */}
      <div className="bg-black px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-[0.24em] text-white/70">
        Edmonton · Calgary · Lethbridge · Medicine Hat · Red Deer · Grande Prairie · Made on demand
      </div>

      {/* Editorial hero */}
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
            {/* City shortcut buttons */}
            <div className="mt-8 flex flex-wrap gap-2">
              {(['Edmonton', 'Calgary', 'Lethbridge', 'Medicine Hat', 'Red Deer', 'Grande Prairie'] as const).map(
                c => (
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
                ),
              )}
            </div>
          </div>

          {/* Featured hoodie */}
          <div className="flex items-center justify-center bg-[#161616] p-6 sm:p-10 lg:p-8">
            <div className="mx-auto w-full max-w-[280px]">
              <HoodieMockup product={SHOP_PRODUCTS[0]} />
            </div>
          </div>
        </div>
      </section>

      {/* Sticky filter + cart bar */}
      <div className="sticky top-0 z-30 border-b border-black/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SHOP_CITIES.map(option => (
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
          <p className="mt-1 text-sm text-black/40">
            {products.length} {products.length === 1 ? 'product' : 'products'}
          </p>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={addToCart}
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

      {/* SEO city links */}
      <section className="border-t border-black/10 bg-[#f8f6f3] px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-black/35">Browse by city</p>
              <h2 className="mt-1.5 text-2xl font-black tracking-tight">Shop your city.</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            {SHOP_PRODUCTS.map(product => (
              <Link
                key={product.slug}
                href={`/shop/${product.slug}`}
                className="group flex flex-col gap-1.5 border border-black/10 bg-white px-4 py-3 transition hover:border-black/30"
              >
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-black/35">
                  {product.type}
                </span>
                <span className="text-sm font-black leading-snug text-black group-hover:underline">
                  {product.keywords[0]}
                </span>
              </Link>
            ))}
          </div>
        </div>
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
          onAdd={addToCart}
          onRemove={removeFromCart}
        />
      )}
    </main>
  )
}
