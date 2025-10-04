
export default function TermsOfServicePage() {
  return (
    <>
      
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
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Agreement to Terms</h2>
                <p className="text-gray-700 mb-6">
                  By accessing and using Culture Alberta's website at culturealberta.com, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mb-6">Description of Service</h2>
                <p className="text-gray-700 mb-6">
                  Culture Alberta provides a platform for sharing and discovering cultural content, events, and stories from Alberta, Canada. Our services include articles, event listings, cultural guides, and community features.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mb-6">User Accounts</h2>
                <p className="text-gray-700 mb-4">
                  When you create an account with us, you must provide accurate and complete information. You are responsible for:
                </p>
                <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
                  <li>Maintaining the security of your account</li>
                  <li>All activities that occur under your account</li>
                  <li>Notifying us immediately of any unauthorized use</li>
                  <li>Ensuring your account information is up to date</li>
                </ul>

                <h2 className="text-2xl font-bold text-gray-900 mb-6">Acceptable Use</h2>
                <p className="text-gray-700 mb-4">
                  You agree not to use our service to:
                </p>
                <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
                  <li>Violate any applicable laws or regulations</li>
                  <li>Infringe upon the rights of others</li>
                  <li>Post false, misleading, or defamatory content</li>
                  <li>Harass, abuse, or harm others</li>
                  <li>Upload malicious code or attempt to hack our systems</li>
                  <li>Spam or send unsolicited communications</li>
                  <li>Impersonate another person or entity</li>
                </ul>

                <h2 className="text-2xl font-bold text-gray-900 mb-6">Content Guidelines</h2>
                <p className="text-gray-700 mb-4">
                  When submitting content to our platform, you agree that:
                </p>
                <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
                  <li>You own or have permission to use the content</li>
                  <li>The content is accurate and truthful</li>
                  <li>The content does not violate any third-party rights</li>
                  <li>The content is appropriate for a general audience</li>
                  <li>You grant us a license to use and display your content</li>
                </ul>

                <h2 className="text-2xl font-bold text-gray-900 mb-6">Intellectual Property</h2>
                <p className="text-gray-700 mb-6">
                  The content on this website, including text, graphics, images, and software, is owned by Culture Alberta or its licensors and is protected by copyright and other intellectual property laws. You may not reproduce, distribute, or create derivative works without our written permission.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mb-6">Privacy Policy</h2>
                <p className="text-gray-700 mb-6">
                  Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the service, to understand our practices regarding the collection and use of your information.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mb-6">Disclaimers</h2>
                <p className="text-gray-700 mb-6">
                  The information on this website is provided "as is" without warranties of any kind. We do not guarantee the accuracy, completeness, or usefulness of any information. We are not responsible for any errors or omissions in the content.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mb-6">Limitation of Liability</h2>
                <p className="text-gray-700 mb-6">
                  In no event shall Culture Alberta be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of the service.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mb-6">Indemnification</h2>
                <p className="text-gray-700 mb-6">
                  You agree to defend, indemnify, and hold harmless Culture Alberta and its officers, directors, employees, and agents from and against any claims, damages, obligations, losses, liabilities, costs, or debt arising from your use of the service.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mb-6">Termination</h2>
                <p className="text-gray-700 mb-6">
                  We may terminate or suspend your account and access to our service immediately, without prior notice, for any reason, including breach of these Terms of Service. Upon termination, your right to use the service will cease immediately.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mb-6">Governing Law</h2>
                <p className="text-gray-700 mb-6">
                  These Terms of Service shall be governed by and construed in accordance with the laws of the Province of Alberta, Canada, without regard to its conflict of law provisions.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mb-6">Changes to Terms</h2>
                <p className="text-gray-700 mb-6">
                  We reserve the right to modify or replace these Terms of Service at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.
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
    </>
  )
}
