import { PageTracker } from '@/components/analytics/page-tracker'

export default function PrivacyPolicyPage() {
  return (
    <>
      <PageTracker title="Privacy Policy" />
      
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
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Introduction</h2>
                <p className="text-gray-700 mb-6">
                  Culture Alberta ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website at culturealberta.com and use our services.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mb-6">Information We Collect</h2>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Personal Information</h3>
                <p className="text-gray-700 mb-4">
                  We may collect personal information that you voluntarily provide to us when you:
                </p>
                <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
                  <li>Subscribe to our newsletter</li>
                  <li>Contact us through our contact forms</li>
                  <li>Sign up for our services</li>
                  <li>Participate in surveys or promotions</li>
                  <li>Submit content or comments</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mb-4">Automatically Collected Information</h3>
                <p className="text-gray-700 mb-4">
                  When you visit our website, we automatically collect certain information about your device, including:
                </p>
                <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
                  <li>IP address and location data</li>
                  <li>Browser type and version</li>
                  <li>Operating system</li>
                  <li>Pages visited and time spent</li>
                  <li>Referring website</li>
                  <li>Device information</li>
                </ul>

                <h2 className="text-2xl font-bold text-gray-900 mb-6">How We Use Your Information</h2>
                <p className="text-gray-700 mb-4">
                  We use the information we collect to:
                </p>
                <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
                  <li>Provide and maintain our services</li>
                  <li>Send newsletters and updates</li>
                  <li>Respond to your inquiries and support requests</li>
                  <li>Improve our website and user experience</li>
                  <li>Analyze usage patterns and trends</li>
                  <li>Comply with legal obligations</li>
                </ul>

                <h2 className="text-2xl font-bold text-gray-900 mb-6">Cookies and Tracking Technologies</h2>
                <p className="text-gray-700 mb-6">
                  We use cookies and similar tracking technologies to enhance your browsing experience, analyze website traffic, and understand where our visitors are coming from. You can control cookie settings through your browser preferences.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mb-6">Third-Party Services</h2>
                <p className="text-gray-700 mb-6">
                  We may use third-party services such as Google Analytics, social media platforms, and email marketing services. These services have their own privacy policies, and we encourage you to review them.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mb-6">Data Security</h2>
                <p className="text-gray-700 mb-6">
                  We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Rights</h2>
                <p className="text-gray-700 mb-4">
                  You have the right to:
                </p>
                <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
                  <li>Access your personal information</li>
                  <li>Correct inaccurate information</li>
                  <li>Request deletion of your information</li>
                  <li>Opt-out of marketing communications</li>
                  <li>Withdraw consent at any time</li>
                </ul>

                <h2 className="text-2xl font-bold text-gray-900 mb-6">Children's Privacy</h2>
                <p className="text-gray-700 mb-6">
                  Our website is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mb-6">Changes to This Policy</h2>
                <p className="text-gray-700 mb-6">
                  We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
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
    </>
  )
}
