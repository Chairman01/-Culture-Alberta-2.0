import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export interface BestOfItem {
  id: string
  name: string
  description: string
  image: string
  location: string
  category: string
  rating: number
  url?: string
}

interface BestOfSectionProps {
  title: string
  description: string
  items: BestOfItem[]
  viewAllLink: string
  categories: string[]
}

export function BestOfSection({ title, description, items, viewAllLink, categories }: BestOfSectionProps) {
  return (
    <section className="w-full py-6 bg-muted/30">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">{title}</h2>
            <p className="text-muted-foreground max-w-[800px] mx-auto">{description}</p>
          </div>
        </div>

        <Tabs defaultValue={categories[0].toLowerCase()} className="w-full">
          <div className="flex items-center justify-between mb-6">
            <TabsList>
              {categories.map((category) => (
                <TabsTrigger key={category} value={category.toLowerCase()}>
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
            <Link
              href={viewAllLink}
              className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
            >
              View All
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>

          {categories.map((category) => (
            <TabsContent key={category} value={category.toLowerCase()} className="mt-0">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {items
                  .filter((item) => item.category.toLowerCase() === category.toLowerCase())
                  .map((item) => (
                    <Link
                      key={item.id}
                      href={item.url || `/best-of/${category.toLowerCase()}/${item.id}`}
                      className="group"
                    >
                      <div className="overflow-hidden rounded-lg border bg-background">
                        <div className="relative">
                          <img
                            src={item.image || "/placeholder.svg"}
                            alt={item.name}
                            className="aspect-[16/9] w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            width={400}
                            height={225}
                          />
                          <div className="absolute top-2 right-2 bg-black text-white text-sm font-bold rounded-full h-8 w-8 flex items-center justify-center">
                            {item.rating}
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="font-bold text-lg group-hover:text-primary">{item.name}</h3>
                          <p className="text-xs text-muted-foreground mb-2">{item.location}</p>
                          <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <div className="mt-8 flex justify-center">
          <Button asChild variant="outline">
            <Link href={viewAllLink}>View All Best of Alberta</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
