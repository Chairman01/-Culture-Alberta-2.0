'use client'

import { useState, useMemo } from 'react'
import { ShoppingBag, Mail, Search, X } from 'lucide-react'

// ─── Data ────────────────────────────────────────────────────────────────────

const ALBERTA_CITIES = [
  'Edmonton', 'Calgary', 'Red Deer', 'Lethbridge', 'Medicine Hat',
  'Grande Prairie', 'Airdrie', 'St. Albert', 'Leduc', 'Spruce Grove',
  'Fort McMurray', 'Chestermere', 'Cold Lake', 'Lloydminster', 'Canmore',
  'Camrose', 'Fort Saskatchewan', 'Brooks', 'Sylvan Lake', 'Okotoks',
  'Wetaskiwin', 'Cochrane', 'Strathmore', 'High River', 'Beaumont',
  'Lacombe', 'Banff', 'Jasper', 'Olds', 'Whitecourt', 'Stony Plain',
  'Edson', 'Innisfail', 'Taber', 'Drumheller', 'Wainwright', 'Bonnyville',
  'Hinton', 'Ponoka', 'Vegreville', 'Slave Lake', 'Peace River',
  'Westlock', 'Barrhead', 'Didsbury', 'Three Hills', 'Fairview',
  'Manning', 'Pincher Creek', 'Crowsnest Pass',
]

const COLORS = [
  { id: 'black',    name: 'Black',        hex: '#111111', text: '#e8e8e8' },
  { id: 'forest',   name: 'Forest Green', hex: '#1c4a28', text: '#cde8d4' },
  { id: 'bone',     name: 'Bone',         hex: '#ede8dc', text: '#1a1a1a' },
  { id: 'burgundy', name: 'Burgundy',     hex: '#581727', text: '#f7d4da' },
  { id: 'navy',     name: 'Navy',         hex: '#0c1a3a', text: '#ccd8f0' },
]

const STYLES = [
  { id: 'hoodie',   name: 'Hoodie',   price: 65 },
  { id: 'tee',      name: 'T-Shirt',  price: 40 },
  { id: 'crewneck', name: 'Crewneck', price: 55 },
]

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

// ─── Display font helper ──────────────────────────────────────────────────────

const displayFont = "var(--font-display, 'Georgia', serif)"

// ─── Product Visual ───────────────────────────────────────────────────────────

function ProductVisual({
  city,
  color,
  style,
}: {
  city: string
  color: (typeof COLORS)[0]
  style: (typeof STYLES)[0]
}) {
  const isLong = city.length > 11

  return (
    <div
      className="relative w-full aspect-[3/4] flex flex-col items-center justify-center overflow-hidden transition-colors duration-700 select-none"
      style={{ backgroundColor: color.hex }}
    >
      {/* Top vignette */}
      <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/30 to-transparent pointer-events-none" />
      {/* Bottom vignette */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />

      {/* Design */}
      <div className="relative z-10 text-center px-8" style={{ color: color.text }}>
        {/* Top micro label */}
        <p
          className="text-[9px] tracking-[0.55em] uppercase mb-7 font-medium"
          style={{ opacity: 0.35 }}
        >
          Culture Alberta
        </p>

        {/* City name */}
        <p
          className={`font-black leading-none tracking-tight ${isLong ? 'text-3xl' : 'text-5xl md:text-6xl'}`}
          style={{ fontFamily: displayFont }}
        >
          {city.toUpperCase()}
        </p>

        {/* Forever */}
        <p
          className="text-4xl md:text-5xl font-black leading-tight tracking-[0.12em] mt-1"
          style={{ fontFamily: displayFont }}
        >
          FOREVER
        </p>

        {/* Infinity */}
        <p
          className="text-6xl md:text-7xl mt-3 leading-none"
          style={{ fontFamily: displayFont, opacity: 0.92 }}
        >
          ∞
        </p>

        {/* Bottom micro label */}
        <p
          className="text-[9px] tracking-[0.55em] uppercase mt-7 font-medium"
          style={{ opacity: 0.35 }}
        >
          Culture Alberta
        </p>
      </div>

      {/* Style watermark */}
      <p
        className="absolute bottom-4 left-4 text-[10px] tracking-[0.25em] uppercase font-medium"
        style={{ color: color.text, opacity: 0.3 }}
      >
        {style.name}
      </p>
    </div>
  )
}

// ─── Waitlist Modal ───────────────────────────────────────────────────────────

function WaitlistModal({
  city,
  color,
  style,
  size,
  onClose,
}: {
  city: string
  color: (typeof COLORS)[0]
  style: (typeof STYLES)[0]
  size: string
  onClose: () => void
}) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitted(true)
    // TODO: POST /api/shop/waitlist
    setTimeout(() => onClose(), 3500)
  }

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-sm">
        <div className="h-1" style={{ backgroundColor: color.hex }} />

        <div className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-[10px] tracking-[0.35em] uppercase text-gray-400 mb-0.5">
                Culturealberta
              </p>
              <h3
                className="text-2xl font-black text-gray-900 leading-tight"
                style={{ fontFamily: displayFont }}
              >
                {city} Forever
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                {style.name} · {color.name} · Size {size}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-300 hover:text-gray-700 transition-colors p-1 -mr-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {submitted ? (
            <div className="text-center py-8">
              <p
                className="text-5xl mb-4 text-gray-900"
                style={{ fontFamily: displayFont }}
              >
                ∞
              </p>
              <p className="font-black text-gray-900 text-lg tracking-tight">
                You&apos;re on the list.
              </p>
              <p className="text-sm text-gray-400 mt-2">
                We&apos;ll email you the moment it&apos;s ready to ship.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                We&apos;re taking pre-orders. Leave your email and we&apos;ll
                notify you the moment your item ships.
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
                className="w-full bg-black text-white py-3.5 text-xs font-bold tracking-[0.2em] uppercase hover:bg-gray-800 active:scale-[0.99] transition-all"
              >
                Notify Me When Ready
              </button>

              <p className="text-[11px] text-gray-400 text-center mt-3">
                No spam. One email when it ships.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ShopPage() {
  const [city, setCity]           = useState('Edmonton')
  const [color, setColor]         = useState(COLORS[0])
  const [style, setStyle]         = useState(STYLES[0])
  const [size, setSize]           = useState<string | null>(null)
  const [search, setSearch]       = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const filteredCities = useMemo(
    () =>
      search
        ? ALBERTA_CITIES.filter((c) => c.toLowerCase().includes(search.toLowerCase()))
        : ALBERTA_CITIES,
    [search],
  )

  return (
    <div className="min-h-screen bg-white">

      {/* ── Brand header ────────────────────────────────────────────────── */}
      <div className="bg-black text-white py-7 px-4 text-center">
        <div className="flex items-center justify-center gap-3">
          <span
            className="text-2xl md:text-3xl font-black tracking-[0.08em]"
            style={{ fontFamily: displayFont }}
          >
            Culturealberta
          </span>
          <span
            className="text-3xl leading-none opacity-70"
            style={{ fontFamily: displayFont }}
          >
            ∞
          </span>
        </div>
        <p className="text-white/35 text-[9px] tracking-[0.55em] uppercase mt-1.5 font-medium">
          Alberta Forever
        </p>
      </div>

      {/* ── Announcement bar ────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 py-2.5 px-4 text-center">
        <p className="text-[11px] text-gray-500 tracking-[0.15em] uppercase font-medium">
          Pre-orders open · Ships in 6–8 weeks · Free shipping over $80
        </p>
      </div>

      {/* ── Configurator ────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 py-10 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-10 lg:gap-16 items-start">

          {/* LEFT — sticky product visual */}
          <div className="lg:sticky lg:top-24 order-1 lg:order-none">
            <ProductVisual city={city} color={color} style={style} />
            <p className="text-center text-[10px] text-gray-300 mt-3 tracking-widest uppercase">
              Design preview — photography coming soon
            </p>
          </div>

          {/* RIGHT — options panel */}
          <div className="order-2 lg:order-none space-y-9">

            {/* Title */}
            <div>
              <p className="text-[10px] tracking-[0.4em] uppercase text-gray-400 mb-1 font-medium">
                Culturealberta
              </p>
              <h1
                className="text-3xl md:text-4xl font-black text-gray-900 leading-tight"
                style={{ fontFamily: displayFont }}
              >
                {city} Forever
              </h1>
              <p className="text-xl font-bold text-gray-900 mt-1.5">
                ${style.price}
                <span className="text-sm font-normal text-gray-400 ml-2">CAD</span>
              </p>
            </div>

            {/* ── City ── */}
            <div>
              <h2 className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-900 mb-3">
                Choose Your City
              </h2>

              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search Alberta cities…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs border border-gray-200 focus:outline-none focus:border-gray-900 bg-gray-50 transition-colors rounded-none"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* City grid */}
              <div className="max-h-48 overflow-y-auto">
                <div className="flex flex-wrap gap-2 pr-1">
                  {filteredCities.length > 0 ? (
                    filteredCities.map((c) => (
                      <button
                        key={c}
                        onClick={() => { setCity(c); setSearch('') }}
                        className={[
                          'px-3 py-1.5 text-[11px] font-semibold border transition-all tracking-wide',
                          city === c
                            ? 'bg-black text-white border-black'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-800 hover:text-gray-900',
                        ].join(' ')}
                      >
                        {c}
                      </button>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 py-2">
                      No results.{' '}
                      <button
                        onClick={() => setSearch('')}
                        className="underline hover:text-gray-700"
                      >
                        Clear
                      </button>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Style ── */}
            <div>
              <h2 className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-900 mb-3">
                Style
              </h2>
              <div className="flex gap-2">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStyle(s)}
                    className={[
                      'flex-1 py-3 px-2 border text-center transition-all',
                      style.id === s.id
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-800',
                    ].join(' ')}
                  >
                    <span className="block text-xs font-bold">{s.name}</span>
                    <span className="block text-[11px] opacity-60 mt-0.5">${s.price}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Colour ── */}
            <div>
              <h2 className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-900 mb-3">
                Colour —{' '}
                <span className="font-normal normal-case text-gray-500">{color.name}</span>
              </h2>
              <div className="flex gap-3">
                {COLORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setColor(c)}
                    title={c.name}
                    className={[
                      'w-9 h-9 transition-all duration-200',
                      color.id === c.id
                        ? 'ring-2 ring-offset-2 ring-black scale-110'
                        : 'ring-1 ring-gray-200 hover:ring-gray-600',
                    ].join(' ')}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            {/* ── Size ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-900">
                  Size{size && <span className="font-normal normal-case text-gray-500 ml-1">— {size}</span>}
                </h2>
                <button className="text-[11px] text-gray-400 hover:text-gray-700 underline transition-colors">
                  Size guide
                </button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {SIZES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={[
                      'w-12 h-12 text-xs font-bold border transition-all',
                      size === s
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-800',
                    ].join(' ')}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* ── CTA ── */}
            <div className="pt-1 space-y-3">
              <button
                onClick={() => size && setModalOpen(true)}
                disabled={!size}
                className={[
                  'w-full py-4 text-xs font-black tracking-[0.25em] uppercase transition-all flex items-center justify-center gap-2.5',
                  size
                    ? 'bg-black text-white hover:bg-gray-800 active:scale-[0.99]'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                ].join(' ')}
              >
                <ShoppingBag className="w-4 h-4" />
                {size ? `Pre-order — $${style.price} CAD` : 'Select a Size to Continue'}
              </button>

              <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                Ships in 6–8 weeks · Free over $80 · Easy returns · Ethically made
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── City request footer ──────────────────────────────────────────── */}
      <div className="border-t border-gray-100 bg-black text-white py-14 px-4 text-center">
        <p
          className="text-4xl mb-3"
          style={{ fontFamily: displayFont }}
        >
          ∞
        </p>
        <p className="text-[10px] tracking-[0.45em] uppercase text-white/40 mb-2 font-medium">
          Missing your city?
        </p>
        <h3
          className="text-2xl font-black mb-5"
          style={{ fontFamily: displayFont }}
        >
          We&apos;re always adding more.
        </h3>
        <a
          href="mailto:hello@culturealberta.com?subject=Shop%20-%20City%20Request"
          className="inline-flex items-center gap-2 border border-white/30 text-white px-6 py-3 text-xs font-bold tracking-[0.2em] uppercase hover:bg-white hover:text-black transition-all"
        >
          <Mail className="w-4 h-4" />
          Request Your City
        </a>
      </div>

      {/* ── Modal ───────────────────────────────────────────────────────── */}
      {modalOpen && size && (
        <WaitlistModal
          city={city}
          color={color}
          style={style}
          size={size}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
