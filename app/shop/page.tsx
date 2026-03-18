'use client'

import { useState } from 'react'
import { Mail, X } from 'lucide-react'

// ─── Data ─────────────────────────────────────────────────────────────────────

const PRODUCTS = [
  { id: 1, city: 'Edmonton', type: 'Hoodie',  price: 65,  collection: 'Culture Alberta', tag: 'NEW' },
  { id: 2, city: 'Calgary',  type: 'Hoodie',  price: 65,  collection: 'Culture Alberta', tag: 'NEW' },
  { id: 3, city: 'Alberta',  type: 'Hoodie',  price: 65,  collection: 'Culture Alberta', tag: null },
  { id: 4, city: 'Edmonton', type: 'T-Shirt', price: 40,  collection: 'Culture Alberta', tag: null },
  { id: 5, city: 'Calgary',  type: 'T-Shirt', price: 40,  collection: 'Culture Alberta', tag: null },
  { id: 6, city: 'Alberta',  type: 'T-Shirt', price: 40,  collection: 'Culture Alberta', tag: null },
]

// ─── Garment SVGs ─────────────────────────────────────────────────────────────

function HoodieGraphic({ city }: { city: string }) {
  const isLong = city.length > 8
  return (
    <svg viewBox="0 0 400 460" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Hoodie body */}
      <path
        d="M 120 110 L 80 130 L 40 200 L 60 210 L 70 180 L 70 420 L 330 420 L 330 180 L 340 210 L 360 200 L 320 130 L 280 110"
        fill="#111111" stroke="none"
      />
      {/* Hood */}
      <path
        d="M 120 110 C 120 60 140 30 200 25 C 260 30 280 60 280 110 C 260 100 240 95 200 95 C 160 95 140 100 120 110 Z"
        fill="#111111" stroke="none"
      />
      {/* Hood inner */}
      <ellipse cx="200" cy="108" rx="52" ry="28" fill="#1e1e1e" />
      {/* Pocket */}
      <path d="M 150 320 L 250 320 L 250 370 L 150 370 Z" fill="#1a1a1a" stroke="none" />
      {/* Zipper line */}
      <line x1="200" y1="110" x2="200" y2="320" stroke="#2a2a2a" strokeWidth="3" />
      {/* Cuffs */}
      <rect x="40" y="205" width="30" height="18" rx="4" fill="#0d0d0d" />
      <rect x="330" y="205" width="30" height="18" rx="4" fill="#0d0d0d" />
      {/* Hem */}
      <rect x="70" y="412" width="260" height="12" rx="4" fill="#0d0d0d" />

      {/* Design text */}
      <text
        x="200" y="215"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontWeight="900"
        fontSize={isLong ? "28" : "36"}
        fill="white"
        letterSpacing="2"
      >
        {city.toUpperCase()}
      </text>
      <text
        x="200" y="258"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontWeight="900"
        fontSize="32"
        fill="white"
        letterSpacing="4"
      >
        FOREVER
      </text>
      <text
        x="200" y="300"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontWeight="900"
        fontSize="38"
        fill="white"
        opacity="0.85"
      >
        ∞
      </text>

      {/* Micro label */}
      <text
        x="200" y="165"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontWeight="500"
        fontSize="9"
        fill="white"
        opacity="0.35"
        letterSpacing="5"
      >
        CULTURE ALBERTA
      </text>
    </svg>
  )
}

function TshirtGraphic({ city }: { city: string }) {
  const isLong = city.length > 8
  return (
    <svg viewBox="0 0 400 420" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* T-shirt body */}
      <path
        d="M 130 60 L 60 100 L 40 160 L 80 170 L 80 390 L 320 390 L 320 170 L 360 160 L 340 100 L 270 60 C 255 90 245 105 200 110 C 155 105 145 90 130 60 Z"
        fill="#111111" stroke="none"
      />
      {/* Collar */}
      <path
        d="M 130 60 C 145 90 155 105 200 110 C 245 105 255 90 270 60"
        fill="none" stroke="#1e1e1e" strokeWidth="8"
      />
      {/* Cuffs */}
      <rect x="38" y="158" width="42" height="14" rx="4" fill="#0d0d0d" />
      <rect x="320" y="158" width="42" height="14" rx="4" fill="#0d0d0d" />
      {/* Hem */}
      <rect x="80" y="382" width="240" height="12" rx="4" fill="#0d0d0d" />

      {/* Design text */}
      <text
        x="200" y="220"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontWeight="900"
        fontSize={isLong ? "30" : "38"}
        fill="white"
        letterSpacing="2"
      >
        {city.toUpperCase()}
      </text>
      <text
        x="200" y="265"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontWeight="900"
        fontSize="34"
        fill="white"
        letterSpacing="4"
      >
        FOREVER
      </text>
      <text
        x="200" y="308"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontWeight="900"
        fontSize="40"
        fill="white"
        opacity="0.85"
      >
        ∞
      </text>

      {/* Micro label */}
      <text
        x="200" y="170"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontWeight="500"
        fontSize="9"
        fill="white"
        opacity="0.35"
        letterSpacing="5"
      >
        CULTURE ALBERTA
      </text>
    </svg>
  )
}

// ─── Waitlist Modal ────────────────────────────────────────────────────────────

function WaitlistModal({
  product,
  onClose,
}: {
  product: typeof PRODUCTS[0]
  onClose: () => void
}) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitted(true)
    setTimeout(() => onClose(), 3500)
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-sm shadow-2xl">
        <div className="h-1 bg-black" />
        <div className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-[10px] tracking-[0.35em] uppercase text-gray-400 mb-0.5 font-medium">
                Culture Alberta
              </p>
              <h3 className="text-xl font-black text-gray-900 leading-tight">
                {product.city} Forever {product.type}
              </h3>
              <p className="text-sm text-gray-400 mt-0.5">${product.price} CAD</p>
            </div>
            <button onClick={onClose} className="text-gray-300 hover:text-gray-700 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {submitted ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-3">∞</p>
              <p className="font-black text-gray-900 text-lg">You&apos;re on the list.</p>
              <p className="text-sm text-gray-400 mt-2">We&apos;ll email you when it&apos;s ready to ship.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                Leave your email and we&apos;ll notify you the moment it ships.
              </p>
              <div className="relative mb-3">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full pl-9 pr-4 py-3 border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition-colors"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-black text-white py-3.5 text-xs font-bold tracking-[0.2em] uppercase hover:bg-gray-800 transition-colors"
              >
                Notify Me When Ready
              </button>
              <p className="text-[11px] text-gray-400 text-center mt-3">No spam. One email when it ships.</p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Product Card ──────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: typeof PRODUCTS[0] }) {
  const [hovered, setHovered] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <div className="group flex flex-col">
        {/* Image */}
        <div
          className="relative w-full aspect-[3/4] bg-white flex items-center justify-center overflow-hidden cursor-pointer border border-gray-100"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={() => setModalOpen(true)}
        >
          <div className={`w-4/5 h-4/5 transition-transform duration-500 ${hovered ? 'scale-105' : 'scale-100'}`}>
            {product.type === 'Hoodie'
              ? <HoodieGraphic city={product.city} />
              : <TshirtGraphic city={product.city} />
            }
          </div>

          {/* Tag */}
          {product.tag && (
            <span className="absolute top-3 left-3 bg-black text-white text-[10px] font-bold tracking-[0.15em] uppercase px-2.5 py-1">
              {product.tag}
            </span>
          )}

          {/* Hover CTA */}
          <div className={`absolute inset-x-0 bottom-0 bg-black text-white text-xs font-bold tracking-[0.2em] uppercase text-center py-3.5 transition-transform duration-300 ${hovered ? 'translate-y-0' : 'translate-y-full'}`}>
            Pre-Order
          </div>
        </div>

        {/* Info — matches Forever Umbrella style */}
        <div className="pt-3 pb-1">
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-gray-400 mb-1">
            {product.collection}
          </p>
          <p className="text-sm font-bold text-gray-900 leading-snug">
            {product.city} Forever {product.type}
          </p>
          <p className="text-sm text-gray-700 mt-0.5">
            ${product.price}.00
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-2 text-xs font-semibold underline underline-offset-2 text-gray-700 hover:text-black transition-colors"
          >
            Pre-Order
          </button>
        </div>
      </div>

      {modalOpen && (
        <WaitlistModal product={product} onClose={() => setModalOpen(false)} />
      )}
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ShopPage() {
  const [filter, setFilter] = useState<'All' | 'Hoodies' | 'T-Shirts'>('All')

  const filtered = PRODUCTS.filter(p =>
    filter === 'All' ? true :
    filter === 'Hoodies' ? p.type === 'Hoodie' :
    p.type === 'T-Shirt'
  )

  return (
    <div className="min-h-screen bg-white">

      {/* ── Top announcement bar ─────────────────────────────────────────── */}
      <div className="bg-black text-white text-center py-2.5 px-4">
        <p className="text-[11px] tracking-[0.18em] uppercase font-medium">
          Pre-orders open · Ships in 6–8 weeks · Free shipping over $80
        </p>
      </div>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="border-b border-gray-100 px-6 py-8 text-center">
        <p className="text-[10px] tracking-[0.45em] uppercase text-gray-400 font-medium mb-2">
          Culture Alberta
        </p>
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-none">
          The Collection
        </h1>
        <p className="text-sm text-gray-400 mt-2">Rep your city. Alberta Forever.</p>
      </div>

      {/* ── Filter bar ───────────────────────────────────────────────────── */}
      <div className="border-b border-gray-100 px-6 py-3 flex items-center justify-center gap-6">
        {(['All', 'Hoodies', 'T-Shirts'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-semibold tracking-[0.12em] uppercase pb-0.5 transition-colors border-b-2 ${
              filter === f
                ? 'text-black border-black'
                : 'text-gray-400 border-transparent hover:text-gray-700'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ── Product grid ─────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
          {filtered.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>

      {/* ── City request footer ───────────────────────────────────────────── */}
      <div className="border-t border-gray-100 bg-black text-white py-14 px-4 text-center mt-6">
        <p className="text-[10px] tracking-[0.45em] uppercase text-white/40 mb-2 font-medium">
          Missing your city?
        </p>
        <h3 className="text-2xl font-black mb-5">We&apos;re always adding more.</h3>
        <a
          href="mailto:hello@culturealberta.com?subject=Shop%20-%20City%20Request"
          className="inline-flex items-center gap-2 border border-white/30 text-white px-6 py-3 text-xs font-bold tracking-[0.2em] uppercase hover:bg-white hover:text-black transition-all"
        >
          <Mail className="w-4 h-4" />
          Request Your City
        </a>
      </div>
    </div>
  )
}
