export default function AlbertaLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <section className="w-full py-12 bg-amber-50 animate-pulse">
          <div className="container mx-auto px-4 md:px-6">
            <div className="h-12 bg-gray-200 rounded w-1/2 mx-auto mb-4" />
            <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto" />
          </div>
        </section>
        <section className="w-full py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-lg aspect-[4/3] animate-pulse" />
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
