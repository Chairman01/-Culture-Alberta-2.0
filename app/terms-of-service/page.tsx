/**
 * Optimized Terms of Service Page (Alternative Route)
 * 
 * Performance optimizations:
 * - Uses ISR (Incremental Static Regeneration) for fast loads
 * - Static page generation (no data fetching)
 * - Optimized for speed and caching
 * 
 * Caching strategy:
 * - Revalidates every 300 seconds (5 minutes)
 * - Falls back to cached version if needed
 * - Reduces server load and improves TTFB
 * 
 * Used as: Terms of Service page (/terms-of-service)
 * Note: This is an alternative route to /terms
 */

// PERFORMANCE: Use ISR for fast cached responses
export const revalidate = 300

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Terms of Service
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              The terms and conditions governing your use of Culture Alberta's website and services.
            </p>
            <p className="text-sm text-gray-500 mt-4">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 lg:p-12">
            
            <div className="prose prose-lg max-w-none">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Acceptance of Terms</h2>
              <p className="text-gray-700 mb-6">
                By accessing and using Culture Alberta, you accept and agree to be bound by the terms 
                and provision of this agreement.
              </p>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Use License</h2>
              <p className="text-gray-700 mb-6">
                Permission is granted to temporarily download one copy of the materials on Culture Alberta 
                for personal, non-commercial transitory viewing only.
              </p>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Content Accuracy</h2>
              <p className="text-gray-700 mb-6">
                While we strive to provide accurate and up-to-date information about Alberta's culture, 
                events, and attractions, we cannot guarantee the accuracy of all information.
              </p>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-6">User Conduct</h2>
              <p className="text-gray-700 mb-6">
                Users are prohibited from using the site for any unlawful purpose or any purpose 
                prohibited under this clause.
              </p>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Limitation of Liability</h2>
              <p className="text-gray-700 mb-6">
                In no event shall Culture Alberta or its suppliers be liable for any damages arising 
                out of the use or inability to use the materials on Culture Alberta.
              </p>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact Information</h2>
              <p className="text-gray-700 mb-6">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-700">
                  <strong>Email:</strong> culturemedia101@gmail.com<br />
                  <strong>Phone:</strong> (226) 236-1828<br />
                  <strong>Address:</strong> Alberta, Canada
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
