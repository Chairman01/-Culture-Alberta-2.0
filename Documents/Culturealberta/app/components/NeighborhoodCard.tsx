import Link from "next/link"
import Image from "next/image"

interface NeighborhoodProps {
  name: string;
  description: string;
  slug: string;
  imagePath: string;
}

export function NeighborhoodCard({ name, description, slug, imagePath }: NeighborhoodProps) {
  return (
    <Link href={`/edmonton/${slug}`} className="group block overflow-hidden rounded-lg border hover:border-blue-600 transition-colors">
      <div className="relative h-48 w-full">
        <Image
          src={imagePath}
          alt={`${name} neighborhood`}
          fill
          className="object-cover"
          priority={false}
        />
      </div>
      <div className="p-4">
        <h3 className="text-lg font-bold group-hover:text-blue-600 transition-colors">{name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
  )
} 