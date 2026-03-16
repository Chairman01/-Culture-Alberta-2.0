'use client'

import { useState } from 'react'
import { ShoppingBag, Check, Star, Truck, RotateCcw, Shield, X, Mail } from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

type Collection = 'all' | 'forever' | 'alberta-life' | 'city-pride'

interface ColorOption {
  name: string
  hex: string
  text: string
}

interface Product {
  id: number
  name: string
  type: 'Hoodie' | 'T-Shirt' | 'Crewneck'
  collection: string
  price: number
  description: string
  colors: ColorOption[]
  sizes: string[]
  badge?: string
  design: string
  tag?: string
  serif?: boolean
  smallText?: boolean
}

// ─── Products ───────────────────────────────────────────────────────────────

const PRODUCTS: Product[] = [
  // ── Forever Series ──────────────────────────────────────────────────────
  {
    id: 1,
    name: 'Edmonton Forever',
    type: 'Hoodie',
    collection: 'forever',
    price: 65,
    description: 'Premium heavyweight hoodie for the city that never stops.',
    colors: [
      { name: 'Forest Green', hex: '#2d5a3d', text: '#c8e6c9' },
      { name: 'Navy', hex: '#1b2a4a', text: '#cfd8e8' },
      { name: 'Black', hex: '#111111', text: '#e5e5e5' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    badge: 'New',
    design: 'EDMONTON\nFOREVER',
    tag: 'YEG',
    serif: true,
  },
  {
    id: 2,
    name: 'Calgary Forever',
    type: 'Hoodie',
    collection: 'forever',
    price: 65,
    description: 'For the city that hustles harder than the Stampede.',
    colors: [
      { name: 'Stampede Red', hex: '#b91c1c', text: '#fde8e8' },
      { name: 'Black', hex: '#111111', text: '#e5e5e5' },
      { name: 'Forest Green', hex: '#2d5a3d', text: '#c8e6c9' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    badge: 'New',
    design: 'CALGARY\nFOREVER',
    tag: 'YYC',
    serif: true,
  },
  {
    id: 3,
    name: 'Red Deer Forever',
    type: 'Hoodie',
    collection: 'forever',
    price: 65,
    description: 'The heart of Alberta — right on your chest.',
    colors: [
      { name: 'Midnight Blue', hex: '#1e3a5f', text: '#cce0f5' },
      { name: 'Burgundy', hex: '#7c2d3e', text: '#f7d4da' },
      { name: 'Forest Green', hex: '#2d5a3d', text: '#c8e6c9' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    design: 'RED DEER\nFOREVER',
    tag: 'YQF',
    serif: true,
  },
  {
    id: 4,
    name: 'Lethbridge Forever',
    type: 'Hoodie',
    collection: 'forever',
    price: 65,
    description: 'Where the wind always has something to say.',
    colors: [
      { name: 'Prairie Sand', hex: '#9a7a50', text: '#fdf4e7' },
      { name: 'Navy', hex: '#1b2a4a', text: '#cfd8e8' },
      { name: 'Black', hex: '#111111', text: '#e5e5e5' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    design: 'LETHBRIDGE\nFOREVER',
    tag: 'YQL',
    serif: true,
  },
  {
    id: 5,
    name: 'Medicine Hat Forever',
    type: 'Hoodie',
    collection: 'forever',
    price: 65,
    description: "Sunniest city in Alberta — now in hoodie form.",
    colors: [
      { name: 'Terracotta', hex: '#b84a20', text: '#fde8dc' },
      { name: 'Deep Teal', hex: '#1a6666', text: '#cceaea' },
      { name: 'Black', hex: '#111111', text: '#e5e5e5' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    design: 'MEDICINE HAT\nFOREVER',
    tag: 'YXH',
    serif: true,
  },
  {
    id: 6,
    name: 'Grande Prairie Forever',
    type: 'Hoodie',
    collection: 'forever',
    price: 65,
    description: 'Born north of the 55th. Proud of it.',
    colors: [
      { name: 'Deep Teal', hex: '#1a6666', text: '#cceaea' },
      { name: 'Forest Green', hex: '#2d5a3d', text: '#c8e6c9' },
      { name: 'Black', hex: '#111111', text: '#e5e5e5' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    design: 'GRANDE PRAIRIE\nFOREVER',
    tag: 'YQU',
    serif: true,
  },

  // ── Alberta Life ─────────────────────────────────────────────────────────
  {
    id: 7,
    name: 'Chinook Season',
    type: 'T-Shirt',
    collection: 'alberta-life',
    price: 40,
    description: "The unofficial Alberta season everyone actually prefers.",
    colors: [
      { name: 'Charcoal', hex: '#2d2d2d', text: '#e0e0e0' },
      { name: 'Cream', hex: '#e8e0d0', text: '#2a2a2a' },
      { name: 'Navy', hex: '#1b2a4a', text: '#cfd8e8' },
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    badge: 'Fan Fav',
    design: 'chinook season\nis my favourite\nseason',
    smallText: true,
  },
  {
    id: 8,
    name: 'Born Prairie',
    type: 'T-Shirt',
    collection: 'alberta-life',
    price: 40,
    description: 'For those equally at home in wheat fields and mountains.',
    colors: [
      { name: 'Sage', hex: '#6a8f6e', text: '#e8f5e9' },
      { name: 'Prairie Tan', hex: '#b8956a', text: '#fdf4e7' },
      { name: 'Charcoal', hex: '#2d2d2d', text: '#e0e0e0' },
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    design: 'born on the\nprairies,\nraised by\nmountains',
    smallText: true,
  },
  {
    id: 9,
    name: "Canada's Best Neighbour",
    type: 'T-Shirt',
    collection: 'alberta-life',
    price: 40,
    description: 'Just doing our thing out here on the prairies.',
    colors: [
      { name: 'White', hex: '#f5f5f5', text: '#1a1a1a' },
      { name: 'Black', hex: '#111111', text: '#e5e5e5' },
      { name: 'Stampede Red', hex: '#b91c1c', text: '#fde8e8' },
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    design: "just trying to be\ncanada's best\nneighbour",
    smallText: true,
  },

  // ── City Pride ────────────────────────────────────────────────────────────
  {
    id: 10,
    name: 'YEG or YYC',
    type: 'Crewneck',
    collection: 'city-pride',
    price: 55,
    description: "Pick a side. (Or don't. We don't judge.)",
    colors: [
      { name: 'Heather Grey', hex: '#787878', text: '#f0f0f0' },
      { name: 'Navy', hex: '#1b2a4a', text: '#cfd8e8' },
      { name: 'Forest Green', hex: '#2d5a3d', text: '#c8e6c9' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    badge: 'Limited',
    design: 'YEG\nor\nYYC',
    serif: true,
  },
  {
    id: 11,
    name: 'Alberta Wild',
    type: 'Crewneck',
    collection: 'city-pride',
    price: 55,
    description: "For those who'd rather be in Banff right now.",
    colors: [
      { name: 'Forest Green', hex: '#2d5a3d', text: '#c8e6c9' },
      { name: 'Burgundy', hex: '#7c2d3e', text: '#f7d4da' },
      { name: 'Black', hex: '#111111', text: '#e5e5e5' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    design: 'ALBERTA\nWILD',
    tag: 'AB',
    serif: true,
  },
  {
    id: 12,
    name: 'Culture Alberta',
    type: 'Hoodie',
    collection: 'city-pride',
    price: 70,
    description: 'The original. Support local culture.',
    colors: [
      { name: 'Black', hex: '#111111', text: '#e5e5e5' },
      { name: 'White', hex: '#f5f5f5', text: '#1a1a1a' },
      { name: 'Forest Green', hex: '#2d5a3d', text: '#c8e6c9' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    badge: 'Signature',
    design: 'CULTURE\nALBERTA',
    serif: true,
  },
]

// ─── Clothing Visual ─────────────────────────────────────────────────────────

function ClothingVisual({ product, color }: { product: Product; color: ColorOption }) {
  const lines = product.design.split('\n')
  const isSmall = product.smallText || lines.length > 3

  return (
    <div
      className="relative w-full aspect-square flex flex-col items-center justify-center overflow-hidden transition-colors duration-500"
      style={{ backgroundColor: color.hex }}
    >
      {/* Depth gradients */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/10 pointer-events-none" />

      {/* Badge */}
      {product.badge && (
        <span className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white text-gray-900 shadow-sm tracking-wide">
          {product.badge}
        </span>
      )}

      {/* Type label */}
      <span
        className="absolute top-3 right-3 z-10 px-2 py-0.5 rounded-full text-[11px] font-medium border border-current"
        style={{ color: `${color.text}99` }}
      >
        {product.type}
      </span>

      {/* Design */}
      <div className="relative z-10 text-center px-6 py-4 select-none">
        {product.tag && (
          <p
            className="text-[11px] tracking-[0.35em] mb-2 font-medium uppercase"
            style={{ color: `${color.text}80` }}
          >
            {product.tag}
          </p>
        )}

        <div className="space-y-0.5">
          {lines.map((line, i) => (
            <p
              key={i}
              className={[
                'leading-none font-bold tracking-tight',
                product.serif ? 'font-serif' : 'font-sans',
                isSmall ? 'text-lg' : lines.length === 2 ? 'text-4xl' : 'text-3xl',
              ].join(' ')}
              style={{ color: color.text }}
            >
              {line}
            </p>
          ))}
        </div>

        <p
          className="text-[9px] tracking-[0.4em] mt-4 uppercase font-medium"
          style={{ color: `${color.text}40` }}
        >
          Culture Alberta
        </p>
      </div>
    </div>
  )
}

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onPreorder,
}: {
  product: Product
  onPreorder: (p: Product, color: string, size: string) => void
}) {
  const [colorIdx, setColorIdx] = useState(0)
  const [sizeIdx, setSizeIdx] = useState<number | null>(null)
  const [added, setAdded] = useState(false)

  const selectedColor = product.colors[colorIdx]

  const handleAdd = () => {
    if (sizeIdx === null) return
    setAdded(true)
    onPreorder(product, selectedColor.name, product.sizes[sizeIdx])
    setTimeout(() => setAdded(false), 2500)
  }

  return (
    <div className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 flex flex-col">
      <ClothingVisual product={product} color={selectedColor} />

      <div className="p-4 flex flex-col flex-1">
        {/* Title + price */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-gray-900 text-sm leading-snug">{product.name}</h3>
          <span className="text-sm font-bold text-gray-900 shrink-0">${product.price}</span>
        </div>

        <p className="text-xs text-gray-500 mb-4 leading-relaxed flex-1">{product.description}</p>

        {/* Color swatches */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] text-gray-400 truncate flex-1">{selectedColor.name}</span>
          <div className="flex gap-1.5">
            {product.colors.map((c, i) => (
              <button
                key={i}
                onClick={() => setColorIdx(i)}
                title={c.name}
                className={[
                  'w-5 h-5 rounded-full transition-all duration-200',
                  colorIdx === i
                    ? 'ring-2 ring-offset-1 ring-gray-800 scale-110'
                    : 'ring-1 ring-transparent hover:ring-gray-300',
                ].join(' ')}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </div>

        {/* Sizes */}
        <div className="flex flex-wrap gap-1 mb-4">
          {product.sizes.map((size, i) => (
            <button
              key={i}
              onClick={() => setSizeIdx(i)}
              className={[
                'px-2 py-1 text-[11px] font-medium rounded-md border transition-all',
                sizeIdx === i
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400',
              ].join(' ')}
            >
              {size}
            </button>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={handleAdd}
          disabled={sizeIdx === null}
          className={[
            'w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2',
            added
              ? 'bg-green-600 text-white'
              : sizeIdx !== null
              ? 'bg-gray-900 text-white hover:bg-gray-700 active:scale-[0.98]'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed',
          ].join(' ')}
        >
          {added ? (
            <>
              <Check className="w-4 h-4" />
              Added to Waitlist
            </>
          ) : sizeIdx === null ? (
            'Select a Size'
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" />
              Pre-order Now
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Waitlist Modal ──────────────────────────────────────────────────────────

function WaitlistModal({
  item,
  onClose,
}: {
  item: { product: Product; color: string; size: string }
  onClose: () => void
}) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitted(true)
    // TODO: POST to /api/shop/waitlist
    setTimeout(() => {
      onClose()
    }, 3000)
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        {/* Header strip in selected color */}
        <div
          className="h-2"
          style={{ backgroundColor: item.product.colors.find(c => c.name === item.color)?.hex ?? '#111' }}
        />

        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-bold text-gray-900 text-lg leading-tight">{item.product.name}</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {item.product.type} · {item.color} · Size {item.size}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 transition-colors p-1 -mr-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {submitted ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-7 h-7 text-green-600" />
              </div>
              <p className="font-bold text-gray-900 text-lg">You&apos;re on the list!</p>
              <p className="text-sm text-gray-500 mt-1">
                We&apos;ll email you when your item is ready to ship.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                We&apos;re taking pre-orders now. Drop your email and we&apos;ll notify you the
                moment it&apos;s ready to ship.
              </p>

              <div className="relative mb-3">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-700 active:scale-[0.98] transition-all text-sm"
              >
                Notify Me When Ready
              </button>

              <p className="text-[11px] text-gray-400 text-center mt-3">
                No spam. Just one email when your item ships.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

const COLLECTIONS = [
  { key: 'all', label: 'All' },
  { key: 'forever', label: '🏙 Forever Series' },
  { key: 'alberta-life', label: '🌾 Alberta Life' },
  { key: 'city-pride', label: '❤️ City Pride' },
]

const COLLECTION_INFO: Record<string, { title: string; desc: string }> = {
  forever: {
    title: 'Forever Series',
    desc: 'Bold city pride hoodies. Because your city deserves to be remembered forever.',
  },
  'alberta-life': {
    title: 'Alberta Life',
    desc: 'Witty, wearable truths about life in the best province in Canada.',
  },
  'city-pride': {
    title: 'City Pride',
    desc: 'Crewnecks, hoodies and tees for people who rep Alberta 365 days a year.',
  },
}

export default function ShopPage() {
  const [activeCollection, setActiveCollection] = useState<Collection>('all')
  const [waitlistItem, setWaitlistItem] = useState<{
    product: Product
    color: string
    size: string
  } | null>(null)

  const filtered =
    activeCollection === 'all'
      ? PRODUCTS
      : PRODUCTS.filter((p) => p.collection === activeCollection)

  const collectionInfo =
    activeCollection !== 'all' ? COLLECTION_INFO[activeCollection] : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative bg-gray-950 text-white overflow-hidden">
        {/* Subtle radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,_#2d5a3d55,_transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_80%_80%,_#1e2d4a44,_transparent)]" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 py-20 md:py-28 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-3.5 py-1.5 text-xs font-medium mb-6 tracking-wide border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Pre-orders now open
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-5">
            Culture Alberta
            <br />
            <span className="text-gray-500">Shop</span>
          </h1>

          <p className="text-gray-400 text-lg md:text-xl max-w-xl mx-auto leading-relaxed">
            Premium locally-inspired clothing. Rep your city.
            <br className="hidden sm:block" />
            Built for Alberta winters — and the summers worth bragging about.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
            {[
              { city: 'Edmonton', color: 'bg-blue-600' },
              { city: 'Calgary', color: 'bg-red-600' },
              { city: 'Red Deer', color: 'bg-indigo-600' },
              { city: 'Lethbridge', color: 'bg-amber-600' },
              { city: 'Medicine Hat', color: 'bg-orange-600' },
              { city: 'Grande Prairie', color: 'bg-teal-600' },
            ].map(({ city, color }) => (
              <span
                key={city}
                className={`${color} text-white text-xs font-semibold px-3 py-1.5 rounded-full`}
              >
                {city}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust bar ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-center gap-6 lg:gap-10 flex-wrap">
          {[
            { icon: Truck, label: 'Free shipping over $80' },
            { icon: RotateCcw, label: 'Easy returns' },
            { icon: Shield, label: 'Ethically made' },
            { icon: Star, label: '100% Alberta-owned' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
              <Icon className="w-3.5 h-3.5 text-gray-400" />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Collection tabs ────────────────────────────────────────────────── */}
      <div className="bg-white sticky top-[56px] z-30 border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex overflow-x-auto scrollbar-hide">
            {COLLECTIONS.map((c) => (
              <button
                key={c.key}
                onClick={() => setActiveCollection(c.key as Collection)}
                className={[
                  'px-5 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-all',
                  activeCollection === c.key
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                ].join(' ')}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Products ──────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Collection header */}
        {collectionInfo && (
          <div className="mb-8 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="font-bold text-gray-900 text-lg">{collectionInfo.title}</h2>
            <p className="text-sm text-gray-500 mt-1">{collectionInfo.desc}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onPreorder={(p, color, size) => setWaitlistItem({ product: p, color, size })}
            />
          ))}
        </div>

        {/* Size guide note */}
        <p className="text-center text-xs text-gray-400 mt-8">
          All garments are unisex and true to size. Hoodies are 400 gsm heavyweight fleece.
          T-shirts are 180 gsm combed cotton.
        </p>
      </div>

      {/* ── City request CTA ──────────────────────────────────────────────── */}
      <section className="bg-gray-950 text-white py-16 px-4 text-center">
        <div className="max-w-lg mx-auto">
          <p className="text-gray-400 text-sm tracking-widest uppercase mb-3 font-medium">
            Missing your city?
          </p>
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            We&apos;re adding more cities.
          </h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Airdrie? Fort McMurray? Canmore? St. Albert? Tell us which city you want next and
            we&apos;ll make it happen.
          </p>
          <a
            href="mailto:hello@culturealberta.com?subject=Shop%20-%20City%20Request"
            className="inline-flex items-center gap-2 bg-white text-gray-900 px-7 py-3.5 rounded-full font-semibold hover:bg-gray-100 active:scale-[0.98] transition-all"
          >
            <Mail className="w-4 h-4" />
            Request a City
          </a>
        </div>
      </section>

      {/* ── Waitlist modal ────────────────────────────────────────────────── */}
      {waitlistItem && (
        <WaitlistModal item={waitlistItem} onClose={() => setWaitlistItem(null)} />
      )}
    </div>
  )
}
