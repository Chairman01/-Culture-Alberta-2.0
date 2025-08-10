import { Skeleton } from "@/components/ui/skeleton"
import { MainNavigation } from "@/components/main-navigation"

export default function BestOfDetailLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNavigation />

      <main className="flex-1">
        <article className="container max-w-4xl py-12 md:py-20">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-[100px]" />
              <span className="text-muted-foreground">/</span>
              <Skeleton className="h-5 w-[80px]" />
            </div>

            <Skeleton className="h-12 w-[80%]" />

            <div className="flex flex-wrap items-center gap-4">
              <Skeleton className="h-5 w-[150px]" />
              <Skeleton className="h-5 w-[120px]" />
            </div>
          </div>

          <div className="my-8 overflow-hidden rounded-lg bg-muted">
            <Skeleton className="aspect-video w-full h-[450px]" />
          </div>

          <div className="space-y-6">
            <Skeleton className="h-8 w-[90%]" />

            <Skeleton className="h-6 w-[70%]" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[95%]" />
            <Skeleton className="h-4 w-[90%]" />

            <Skeleton className="h-6 w-[60%]" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[85%]" />

            <div className="space-y-2">
              <Skeleton className="h-4 w-[80%]" />
              <Skeleton className="h-4 w-[75%]" />
              <Skeleton className="h-4 w-[70%]" />
              <Skeleton className="h-4 w-[65%]" />
              <Skeleton className="h-4 w-[60%]" />
            </div>

            <Skeleton className="h-6 w-[50%]" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />

            <Skeleton className="h-6 w-[40%]" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-[70%]" />
              <Skeleton className="h-4 w-[60%]" />
              <Skeleton className="h-4 w-[65%]" />
              <Skeleton className="h-4 w-[55%]" />
              <Skeleton className="h-4 w-[50%]" />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-[200px]" />
            </div>
            <Skeleton className="h-10 w-[100px]" />
          </div>

          <div className="my-10 h-[1px] w-full bg-gray-200" />

          <div className="space-y-8">
            <Skeleton className="h-8 w-[250px]" />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array(3)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-[4/3] w-full rounded-lg" />
                    <Skeleton className="h-6 w-[80%]" />
                    <Skeleton className="h-4 w-[60%]" />
                  </div>
                ))}
            </div>
          </div>
        </article>
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
