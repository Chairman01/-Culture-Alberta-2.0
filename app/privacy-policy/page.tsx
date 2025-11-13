/**
 * Optimized Privacy Policy Page (Alternative Route)
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
 * Used as: Privacy Policy page (/privacy-policy)
 * Note: This is an alternative route to /privacy
 */

// PERFORMANCE: Use ISR for fast cached responses
export const revalidate = 300

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Privacy Policy
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              How we collect, use, and protect your information when you visit Culture Alberta.
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
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Information We Collect</h2>
              <p className="text-gray-700 mb-6">
                Culture Alberta collects information you provide directly to us, such as when you create an account, 
                subscribe to our newsletter, or contact us for support.
              </p>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-6">How We Use Your Information</h2>
              <p className="text-gray-700 mb-6">
                We use the information we collect to provide, maintain, and improve our services, 
                communicate with you, and personalize your experience.
              </p>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Cookies and Tracking</h2>
              <p className="text-gray-700 mb-6">
                We use cookies and similar tracking technologies to enhance your experience on our website 
                and to analyze our traffic. We also use Google Analytics and Google AdSense.
              </p>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Third-Party Services</h2>
              <p className="text-gray-700 mb-6">
                Our website uses Google AdSense for advertising. Google may use cookies to serve ads 
                based on your visits to this site and other sites on the Internet.
              </p>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact Us</h2>
              <p className="text-gray-700 mb-6">
                If you have any questions about this Privacy Policy, please contact us at:
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
