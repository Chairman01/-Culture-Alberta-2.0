'use client'

import { useState } from 'react'
import { Mail, X } from 'lucide-react'

// ─── Data ─────────────────────────────────────────────────────────────────────

const PRODUCTS = [
  { id: 1, city: 'Edmonton', type: 'Hoodie',  price: 65, collection: 'Culture Alberta', tag: 'NEW' },
  { id: 2, city: 'Calgary',  type: 'Hoodie',  price: 65, collection: 'Culture Alberta', tag: 'NEW' },
  { id: 3, city: 'Alberta',  type: 'Hoodie',  price: 65, collection: 'Culture Alberta', tag: null },
  { id: 4, city: 'Edmonton', type: 'T-Shirt', price: 40, collection: 'Culture Alberta', tag: null },
  { id: 5, city: 'Calgary',  type: 'T-Shirt', price: 40, collection: 'Culture Alberta', tag: null },
  { id: 6, city: 'Alberta',  type: 'T-Shirt', price: 40, collection: 'Culture Alberta', tag: null },
]

// ─── SVG Filters (shared) ─────────────────────────────────────────────────────
// These make the design look printed/pressed into the fabric rather than floating over it

function SvgDefs() {
  return (
    <defs>
      {/* Fabric print filter — displaces text slightly following fabric grain,
          then softens edges so ink looks absorbed into cloth */}
      <filter id="fabric-print" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.04 0.065"
          numOctaves="4"
          seed="9"
          result="noise"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="noise"
          scale="2.8"
          xChannelSelector="R"
          yChannelSelector="G"
          result="warped"
        />
        <feGaussianBlur in="warped" stdDeviation="0.55" result="soft" />
        <feComposite in="soft" in2="SourceGraphic" operator="in" />
      </filter>

      {/* Subtle emboss/depth — gives the print a very slight raised feel */}
      <filter id="print-depth" x="-5%" y="-5%" width="110%" height="110%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="blur" />
        <feOffset dx="0" dy="1.5" result="shifted" />
        <feComposite in="SourceGraphic" in2="shifted" operator="over" />
      </filter>
    </defs>
  )
}

// ─── Hoodie Graphic ───────────────────────────────────────────────────────────

function HoodieGraphic({ city }: { city: string }) {
  const isLong = city.length > 8
  const fontSize = isLong ? 30 : 38

  return (
    <svg
      viewBox="0 0 400 480"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full drop-shadow-md"
      aria-hidden
    >
      <SvgDefs />

      {/* ── Garment ── */}

      {/* Main body */}
      <path
        d="M 108 148
           L 55 178 L 28 248 L 58 258 L 68 222
           L 68 438 L 332 438
           L 332 222 L 342 258 L 372 248
           L 345 178 L 292 148
           C 275 168 248 180 200 182
           C 152 180 125 168 108 148 Z"
        fill="#111111"
      />

      {/* Hood */}
      <path
        d="M 108 148
           C 96 106 108 62 136 40
           C 156 26 178 20 200 20
           C 222 20 244 26 264 40
           C 292 62 304 106 292 148
           C 270 132 238 122 200 122
           C 162 122 130 132 108 148 Z"
        fill="#111111"
      />

      {/* Hood shadow / inner opening */}
      <ellipse cx="200" cy="146" rx="62" ry="32" fill="#0c0c0c" />

      {/* Hood edge highlight */}
      <path
        d="M 138 148 C 155 136 175 130 200 130 C 225 130 245 136 262 148"
        fill="none"
        stroke="#1c1c1c"
        strokeWidth="3"
      />

      {/* Drawstrings */}
      <line x1="185" y1="148" x2="170" y2="250" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />
      <line x1="215" y1="148" x2="230" y2="250" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />
      {/* Drawstring tips */}
      <ellipse cx="170" cy="252" rx="5" ry="7" fill="#0f0f0f" />
      <ellipse cx="230" cy="252" rx="5" ry="7" fill="#0f0f0f" />

      {/* Seam lines */}
      <line x1="200" y1="182" x2="200" y2="438" stroke="#171717" strokeWidth="1.5" strokeDasharray="0" />

      {/* Kangaroo pocket */}
      <path
        d="M 138 340 Q 136 324 152 320 L 248 320 Q 264 324 262 340 L 262 400 L 138 400 Z"
        fill="#0d0d0d"
      />
      {/* Pocket top seam */}
      <path
        d="M 138 340 Q 138 328 152 326 L 248 326 Q 262 328 262 340"
        fill="none" stroke="#181818" strokeWidth="2"
      />
      {/* Pocket split */}
      <line x1="200" y1="326" x2="200" y2="400" stroke="#181818" strokeWidth="1.5" />

      {/* Left sleeve seam */}
      <path d="M 68 222 L 56 260" stroke="#171717" strokeWidth="1.5" />
      {/* Right sleeve seam */}
      <path d="M 332 222 L 344 260" stroke="#171717" strokeWidth="1.5" />

      {/* Cuffs — ribbed */}
      <rect x="28" y="245" width="30" height="18" rx="5" fill="#0a0a0a" />
      {[35, 41, 47].map(x => (
        <line key={x} x1={x} y1="245" x2={x} y2="263" stroke="#171717" strokeWidth="1.5" />
      ))}
      <rect x="342" y="245" width="30" height="18" rx="5" fill="#0a0a0a" />
      {[349, 355, 361].map(x => (
        <line key={x} x1={x} y1="245" x2={x} y2="263" stroke="#171717" strokeWidth="1.5" />
      ))}

      {/* Hem — ribbed */}
      <rect x="68" y="428" width="264" height="14" rx="5" fill="#0a0a0a" />
      {[85, 100, 116, 132, 148, 164, 180, 200, 216, 232, 248, 264, 280, 296, 315].map(x => (
        <line key={x} x1={x} y1="428" x2={x} y2="442" stroke="#171717" strokeWidth="1.5" />
      ))}

      {/* ── Printed design — wrapped in fabric-print filter ── */}
      <g filter="url(#fabric-print)">
        {/* Micro label top */}
        <text
          x="200" y="212"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
          fontWeight="500"
          fontSize="9"
          fill="#e0e0e0"
          opacity="0.28"
          letterSpacing="6"
        >
          CULTURE ALBERTA
        </text>

        {/* City name */}
        <text
          x="200" y="262"
          textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontWeight="900"
          fontSize={fontSize}
          fill="#f0f0f0"
          opacity="0.90"
          letterSpacing="1.5"
        >
          {city.toUpperCase()}
        </text>

        {/* FOREVER */}
        <text
          x="200" y="305"
          textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontWeight="900"
          fontSize="34"
          fill="#f0f0f0"
          opacity="0.88"
          letterSpacing="5"
        >
          FOREVER
        </text>

        {/* Infinity */}
        <text
          x="200" y="342"
          textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="36"
          fill="#f0f0f0"
          opacity="0.60"
        >
          ∞
        </text>

        {/* Micro label bottom */}
        <text
          x="200" y="365"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
          fontWeight="500"
          fontSize="9"
          fill="#e0e0e0"
          opacity="0.28"
          letterSpacing="6"
        >
          CULTURE ALBERTA
        </text>
      </g>
    </svg>
  )
}

// ─── T-Shirt Graphic ──────────────────────────────────────────────────────────

function TshirtGraphic({ city }: { city: string }) {
  const isLong = city.length > 8
  const fontSize = isLong ? 32 : 40

  return (
    <svg
      viewBox="0 0 400 440"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full drop-shadow-md"
      aria-hidden
    >
      <SvgDefs />

      {/* ── Garment ── */}

      {/* Main body */}
      <path
        d="M 128 68
           L 52 110 L 28 178 L 68 188 L 78 155
           L 78 406 L 322 406
           L 322 155 L 332 188 L 372 178
           L 348 110 L 272 68
           C 256 96 234 112 200 116
           C 166 112 144 96 128 68 Z"
        fill="#111111"
      />

      {/* Collar */}
      <path
        d="M 128 68 C 144 96 166 112 200 116 C 234 112 256 96 272 68"
        fill="none"
        stroke="#1c1c1c"
        strokeWidth="5"
        strokeLinecap="round"
      />

      {/* Collar inner */}
      <path
        d="M 140 70 C 158 94 176 106 200 110 C 224 106 242 94 260 70"
        fill="none"
        stroke="#0e0e0e"
        strokeWidth="3"
      />

      {/* Side seams */}
      <line x1="78" y1="155" x2="78" y2="406" stroke="#171717" strokeWidth="1.5" />
      <line x1="322" y1="155" x2="322" y2="406" stroke="#171717" strokeWidth="1.5" />

      {/* Shoulder seams */}
      <line x1="128" y1="68" x2="78" y2="155" stroke="#171717" strokeWidth="1.5" />
      <line x1="272" y1="68" x2="322" y2="155" stroke="#171717" strokeWidth="1.5" />

      {/* Cuffs */}
      <rect x="28" y="175" width="40" height="16" rx="5" fill="#0a0a0a" />
      {[38, 47, 56].map(x => (
        <line key={x} x1={x} y1="175" x2={x} y2="191" stroke="#171717" strokeWidth="1.5" />
      ))}
      <rect x="332" y="175" width="40" height="16" rx="5" fill="#0a0a0a" />
      {[342, 351, 360].map(x => (
        <line key={x} x1={x} y1="175" x2={x} y2="191" stroke="#171717" strokeWidth="1.5" />
      ))}

      {/* Hem */}
      <rect x="78" y="396" width="244" height="13" rx="5" fill="#0a0a0a" />
      {[95, 112, 130, 148, 168, 188, 200, 216, 234, 252, 270, 288, 308].map(x => (
        <line key={x} x1={x} y1="396" x2={x} y2="409" stroke="#171717" strokeWidth="1.5" />
      ))}

      {/* ── Printed design ── */}
      <g filter="url(#fabric-print)">
        {/* Micro label */}
        <text
          x="200" y="198"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
          fontWeight="500"
          fontSize="9"
          fill="#e0e0e0"
          opacity="0.28"
          letterSpacing="6"
        >
          CULTURE ALBERTA
        </text>

        {/* City */}
        <text
          x="200" y="256"
          textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontWeight="900"
          fontSize={fontSize}
          fill="#f0f0f0"
          opacity="0.90"
          letterSpacing="1.5"
        >
          {city.toUpperCase()}
        </text>

        {/* FOREVER */}
        <text
          x="200" y="300"
          textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontWeight="900"
          fontSize="36"
          fill="#f0f0f0"
          opacity="0.88"
          letterSpacing="5"
        >
          FOREVER
        </text>

        {/* Infinity */}
        <text
          x="200" y="340"
          textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="38"
          fill="#f0f0f0"
          opacity="0.60"
        >
          ∞
        </text>

        {/* Micro label bottom */}
        <text
          x="200" y="362"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
          fontWeight="500"
          fontSize="9"
          fill="#e0e0e0"
          opacity="0.28"
          letterSpacing="6"
        >
          CULTURE ALBERTA
        </text>
      </g>
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
              <p className="text-sm text-gray-400 mt-0.5">${product.price}.00 CAD</p>
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
        <div
          className="relative w-full aspect-[3/4] bg-white flex items-center justify-center overflow-hidden cursor-pointer"
          style={{ boxShadow: 'inset 0 0 0 1px #f0f0f0' }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={() => setModalOpen(true)}
        >
          {/* Slight fabric background texture */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'4\' height=\'4\'%3E%3Crect width=\'1\' height=\'1\' fill=\'%23000\'/%3E%3C/svg%3E")',
            }}
          />

          <div className={`w-[82%] h-[82%] transition-transform duration-500 ${hovered ? 'scale-105' : 'scale-100'}`}>
            {product.type === 'Hoodie'
              ? <HoodieGraphic city={product.city} />
              : <TshirtGraphic city={product.city} />
            }
          </div>

          {product.tag && (
            <span className="absolute top-3 left-3 bg-black text-white text-[10px] font-bold tracking-[0.15em] uppercase px-2.5 py-1">
              {product.tag}
            </span>
          )}

          <div className={`absolute inset-x-0 bottom-0 bg-black text-white text-xs font-bold tracking-[0.2em] uppercase text-center py-3.5 transition-transform duration-300 ${hovered ? 'translate-y-0' : 'translate-y-full'}`}>
            Pre-Order
          </div>
        </div>

        <div className="pt-3 pb-1">
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-gray-400 mb-1">
            {product.collection}
          </p>
          <p className="text-sm font-bold text-gray-900 leading-snug">
            {product.city} Forever {product.type}
          </p>
          <p className="text-sm text-gray-700 mt-0.5">${product.price}.00</p>
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
      <div className="bg-black text-white text-center py-2.5 px-4">
        <p className="text-[11px] tracking-[0.18em] uppercase font-medium">
          Pre-orders open · Ships in 6–8 weeks · Free shipping over $80
        </p>
      </div>

      <div className="border-b border-gray-100 px-6 py-8 text-center">
        <p className="text-[10px] tracking-[0.45em] uppercase text-gray-400 font-medium mb-2">
          Culture Alberta
        </p>
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-none">
          The Collection
        </h1>
        <p className="text-sm text-gray-400 mt-2">Rep your city. Alberta Forever.</p>
      </div>

      <div className="border-b border-gray-100 px-6 py-3 flex items-center justify-center gap-6">
        {(['All', 'Hoodies', 'T-Shirts'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-semibold tracking-[0.12em] uppercase pb-0.5 transition-colors border-b-2 ${
              filter === f ? 'text-black border-black' : 'text-gray-400 border-transparent hover:text-gray-700'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
          {filtered.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>

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
