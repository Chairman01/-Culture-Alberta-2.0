import { Skeleton } from "@/components/ui/skeleton"
import { MainNavigation } from "@/components/main-navigation"
import { Footer } from "@/components/footer"

export default function ArtsLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNavigation />
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-100">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <Skeleton className="h-12 w-[300px] mx-auto" />
                <Skeleton className="h-6 w-[600px] mx-auto" />
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <Skeleton className="h-10 w-[250px] mx-auto" />
                <Skeleton className="h-6 w-[400px] mx-auto" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-8">
              {Array(6)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow">
                    <Skeleton className="aspect-video w-full" />
                    <div className="p-6">
                      <Skeleton className="h-6 w-[80%] mb-2" />
                      <Skeleton className="h-4 w-[60%] mb-4" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-[40%]" />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-100">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <Skeleton className="h-10 w-[250px] mx-auto" />
                <Skeleton className="h-6 w-[400px] mx-auto" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-8">
              {Array(3)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow">
                    <Skeleton className="aspect-video w-full" />
                    <div className="p-6">
                      <Skeleton className="h-6 w-[80%] mb-2" />
                      <Skeleton className="h-4 w-[60%] mb-4" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-10 w-[40%]" />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
