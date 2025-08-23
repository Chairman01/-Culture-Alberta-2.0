import { Skeleton } from "@/components/ui/skeleton"

export function HomeSkeleton() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        {/* Hero Section Skeleton */}
        <section className="relative bg-gradient-to-r from-blue-600 to-purple-700 text-white py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <Skeleton className="h-12 w-3/4 mx-auto mb-4 bg-white/20" />
              <Skeleton className="h-6 w-1/2 mx-auto mb-8 bg-white/20" />
              <Skeleton className="h-12 w-48 mx-auto bg-white/20" />
            </div>
          </div>
        </section>

        {/* Featured Articles Skeleton */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <Skeleton className="h-8 w-64 mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <div className="p-6">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Events Skeleton */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <Skeleton className="h-8 w-48 mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <Skeleton className="h-32 w-full" />
                  <div className="p-6">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
