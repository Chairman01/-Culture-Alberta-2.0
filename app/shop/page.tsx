import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Shop | Culture Alberta",
  description: "Rep your city with Culture Alberta merch. Edmonton Forever, Calgary Forever, Alberta Forever hoodies and tees — coming soon.",
  openGraph: {
    title: "Shop | Culture Alberta",
    description: "Rep your city with Culture Alberta merch. Coming soon.",
    siteName: "Culture Alberta",
  },
}

interface Product {
  id: number
  name: string
  collection: string
  price: string
  city: "Edmonton" | "Calgary" | "Alberta"
  type: "Hoodie" | "T-Shirt"
}

const products: Product[] = [
  {
    id: 1,
    name: "Edmonton Forever Hoodie",
    collection: "Culture Alberta",
    price: "$89.99",
    city: "Edmonton",
    type: "Hoodie",
  },
  {
    id: 2,
    name: "Calgary Forever Hoodie",
    collection: "Culture Alberta",
    price: "$89.99",
    city: "Calgary",
    type: "Hoodie",
  },
  {
    id: 3,
    name: "Alberta Forever Hoodie",
    collection: "Culture Alberta",
    price: "$89.99",
    city: "Alberta",
    type: "Hoodie",
  },
  {
    id: 4,
    name: "Edmonton Forever T-Shirt",
    collection: "Culture Alberta",
    price: "$44.99",
    city: "Edmonton",
    type: "T-Shirt",
  },
  {
    id: 5,
    name: "Calgary Forever T-Shirt",
    collection: "Culture Alberta",
    price: "$44.99",
    city: "Calgary",
    type: "T-Shirt",
  },
  {
    id: 6,
    name: "Alberta Forever T-Shirt",
    collection: "Culture Alberta",
    price: "$44.99",
    city: "Alberta",
    type: "T-Shirt",
  },
]

const cityStyles: Record<Product["city"], { gradient: string; text: string; label: string; icon: string }> = {
  Edmonton: {
    gradient: "from-blue-700 via-blue-800 to-blue-950",
    text: "text-blue-100",
    label: "YEG",
    icon: "🏙️",
  },
  Calgary: {
    gradient: "from-red-600 via-red-800 to-red-950",
    text: "text-red-100",
    label: "YYC",
    icon: "🤠",
  },
  Alberta: {
    gradient: "from-amber-500 via-amber-700 to-amber-900",
    text: "text-amber-100",
    label: "AB",
    icon: "🌾",
  },
}

function ProductPlaceholder({ city, type }: { city: Product["city"]; type: Product["type"] }) {
  const style = cityStyles[city]

  return (
    <div
      className={`w-full h-full bg-gradient-to-br ${style.gradient} flex flex-col items-center justify-center gap-3 select-none`}
    >
      <span className="text-5xl">{style.icon}</span>
      <div className={`text-center ${style.text}`}>
        <p className="text-2xl font-black tracking-tight leading-none">{city.toUpperCase()}</p>
        <p className="text-lg font-bold tracking-widest opacity-80">FOREVER</p>
      </div>
      <span
        className={`text-xs font-semibold tracking-widest uppercase border border-white/30 rounded-full px-3 py-1 ${style.text} opacity-70`}
      >
        {type}
      </span>
    </div>
  )
}

function ProductCard({ product }: { product: Product }) {
  return (
    <div className="group flex flex-col">
      {/* Product Image */}
      <div className="aspect-[3/4] w-full overflow-hidden rounded-sm bg-gray-100 mb-3 relative">
        <ProductPlaceholder city={product.city} type={product.type} />
        {/* Coming Soon overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
          <span className="bg-white text-black text-xs font-bold tracking-widest uppercase px-4 py-2 rounded-sm">
            Coming Soon
          </span>
        </div>
      </div>

      {/* Product Info — matches ForeverUmbrella style */}
      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase">
          {product.collection}
        </p>
        <p className="text-sm font-bold text-gray-900 leading-tight">{product.name}</p>
        <p className="text-sm text-gray-700">{product.price}</p>
        <span className="inline-flex w-fit mt-1 text-[11px] font-semibold tracking-wider uppercase bg-gray-100 text-gray-500 rounded-full px-3 py-1">
          Coming Soon
        </span>
      </div>
    </div>
  )
}

export default function ShopPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Banner */}
      <section className="bg-black text-white py-20 md:py-28 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.3em] text-gray-400 uppercase mb-4">
            Culture Alberta
          </p>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4 leading-none">
            Rep Your City.
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-8 font-light">
            Edmonton Forever. Calgary Forever. Alberta Forever.
          </p>
          <span className="inline-block bg-white/10 border border-white/20 text-white text-xs font-bold tracking-widest uppercase px-5 py-2.5 rounded-full">
            Collection Coming Soon
          </span>
        </div>
      </section>

      {/* Filter Bar */}
      <div className="border-b border-gray-100 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase mr-2">
            Collection
          </span>
          {["All", "Edmonton", "Calgary", "Alberta", "Hoodies", "T-Shirts"].map((label) => (
            <span
              key={label}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border cursor-default ${
                label === "All"
                  ? "bg-black text-white border-black"
                  : "text-gray-600 border-gray-200 hover:border-gray-400"
              }`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <section className="max-w-7xl mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Notify CTA */}
      <section className="bg-gray-50 border-t border-gray-100 py-16 px-4 text-center">
        <div className="max-w-xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.3em] text-gray-400 uppercase mb-3">
            Stay in the loop
          </p>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-3 leading-tight">
            Want to know when we launch?
          </h2>
          <p className="text-gray-500 mb-6 text-sm">
            Follow{" "}
            <a
              href="https://www.instagram.com/culturealberta"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-900 font-semibold underline underline-offset-2"
            >
              @culturealberta
            </a>{" "}
            on Instagram or check back soon.
          </p>
          <a
            href="https://www.instagram.com/culturealberta"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-black text-white text-sm font-bold tracking-wide uppercase px-8 py-3.5 rounded-sm hover:bg-gray-800 transition-colors"
          >
            Follow Us
          </a>
        </div>
      </section>
    </main>
  )
}
