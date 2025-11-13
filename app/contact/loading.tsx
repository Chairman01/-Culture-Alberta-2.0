export default function ContactLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section Skeleton */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <div className="h-12 bg-gray-200 rounded-lg mb-6 animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Contact Information Skeleton */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            
            {/* Contact Details Skeleton */}
            <div className="space-y-8">
              <div>
                <div className="h-8 bg-gray-200 rounded-lg mb-6 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded-lg mb-8 animate-pulse"></div>
              </div>

              {/* Contact Items Skeleton */}
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded-lg mb-2 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded-lg mb-1 animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded-lg animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Contact Form Skeleton */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="h-8 bg-gray-200 rounded-lg mb-6 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded-lg mb-6 animate-pulse"></div>
              
              <div className="space-y-3 mb-8">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded-lg flex-1 animate-pulse"></div>
                  </div>
                ))}
              </div>

              <div className="bg-gray-100 rounded-lg p-6">
                <div className="h-5 bg-gray-200 rounded-lg mb-2 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded-lg animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
