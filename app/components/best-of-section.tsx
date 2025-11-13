import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { ReliableImage } from "@/components/reliable-image"

interface BestOfItem {
  id: string
  name: string
  description: string
  image: string
  category: string
  rating: number
}

interface BestOfSectionProps {
  title: string
  description: string
  items: BestOfItem[]
  viewAllLink: string
  categories: string[]
}

export function BestOfSection({
  title,
  description,
  items,
  viewAllLink,
  categories
}: BestOfSectionProps) {
  return (
    <section className="w-full py-12">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col items-center text-center mb-12">
          <h2 className="text-2xl font-bold mb-4">{title}</h2>
          <p className="text-muted-foreground mx-auto max-w-3xl mb-6">{description}</p>
          <div className="flex justify-center space-x-6 mx-auto mb-4">
            {categories.map((category) => (
              <Link
                key={category}
                href="/best-of"
                className={`text-sm transition-colors ${
                  category === "Dentists" 
                    ? "text-black font-medium" 
                    : "text-gray-500 hover:text-black"
                }`}
              >
                {category}
              </Link>
            ))}
          </div>
          <div className="flex justify-center">
            <Link
              href={viewAllLink}
              className="flex items-center text-sm text-gray-500 hover:text-black"
            >
              View All
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 w-full">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/best-of/${item.category.toLowerCase()}/${item.id}`}
              className="group"
            >
              <div className="overflow-hidden rounded-lg bg-muted aspect-[4/3]">
                <ReliableImage
                  src={item.image}
                  alt={item.name}
                  width={400}
                  height={300}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="mt-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">
                    {item.category}
                  </span>
                  <span>★ {item.rating.toFixed(1)}</span>
                </div>
                <h3 className="mt-2 font-bold group-hover:text-primary line-clamp-2">{item.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{item.description}</p>
              </div>
            </Link>
          ))}
        </div>
        <div className="flex justify-center mt-8">
          <Link href="/best-of" className="inline-block rounded-md border px-8 py-2 text-sm font-medium">
            View All Best of Alberta
          </Link>
        </div>
      </div>
    </section>
  )
} 