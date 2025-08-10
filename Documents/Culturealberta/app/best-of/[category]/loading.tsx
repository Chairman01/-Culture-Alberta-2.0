import { Skeleton } from "@/components/ui/skeleton"
import { MainNavigation } from "@/components/main-navigation"

export default function BestOfCategoryLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNavigation />

      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <Skeleton className="h-12 w-[300px] mx-auto" />
                <Skeleton className="h-6 w-[600px] mx-auto" />
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12">
          <div className="container px-4 md:px-6">
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-10 w-[300px]" />
              <Skeleton className="h-10 w-[100px]" />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array(6)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-lg border bg-background">
                    <Skeleton className="aspect-[16/9] w-full" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-6 w-[200px]" />
                      <Skeleton className="h-4 w-[150px]" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-[80%]" />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full border-t bg-background py-6">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <Skeleton className="h-5 w-[300px]" />
          <div className="flex gap-4 sm:gap-6">
            <Skeleton className="h-5 w-[50px]" />
            <Skeleton className="h-5 w-[50px]" />
            <Skeleton className="h-5 w-[50px]" />
            <Skeleton className="h-5 w-[50px]" />
          </div>
        </div>
      </footer>
    </div>
  )
}
