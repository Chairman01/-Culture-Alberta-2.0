export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>

      <div className="prose max-w-none space-y-6">
        <p className="text-gray-600">
          <strong>Last updated:</strong> {new Date().toLocaleDateString()}
        </p>

        <p className="text-lg">
          At Culture Alberta ("we," "us," or "our"), we are committed to protecting your privacy.
          This Privacy Policy explains how we collect, use, disclose, and safeguard your information
          when you visit our website culturealberta.com.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">1. Information We Collect</h2>

        <h3 className="text-xl font-semibold mt-6 mb-3">1.1 Information You Provide</h3>
        <p className="mb-4">
          We may collect information that you voluntarily provide to us when you:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Subscribe to our newsletter</li>
          <li>Contact us via email or contact forms</li>
          <li>Participate in surveys or promotions</li>
          <li>Comment on our articles or engage with our content</li>
        </ul>
        <p className="mb-4">
          This information may include your name, email address, phone number, and any other
          information you choose to provide.
        </p>

        <h3 className="text-xl font-semibold mt-6 mb-3">1.2 Automatically Collected Information</h3>
        <p className="mb-4">
          When you visit our website, we automatically collect certain information about your
          device and browsing activity, including:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>IP address</li>
          <li>Browser type and version</li>
          <li>Operating system</li>
          <li>Referring website</li>
          <li>Pages visited and time spent on pages</li>
          <li>Date and time of visit</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">2. How We Use Your Information</h2>
        <p className="mb-4">
          We use the information we collect to:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Provide, maintain, and improve our website and services</li>
          <li>Send you newsletters and updates (with your consent)</li>
          <li>Respond to your inquiries and provide customer support</li>
          <li>Analyze website usage and trends to improve user experience</li>
          <li>Detect, prevent, and address technical issues and security threats</li>
          <li>Comply with legal obligations</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">3. Cookies and Tracking Technologies</h2>
        <p className="mb-4">
          We use cookies and similar tracking technologies to enhance your experience on our website.
          Cookies are small text files stored on your device that help us:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Remember your preferences and settings</li>
          <li>Understand how you use our website</li>
          <li>Improve website functionality and performance</li>
          <li>Deliver personalized content and advertisements</li>
        </ul>
        <p className="mb-4">
          You can control cookie settings through your browser. However, disabling cookies may
          affect your ability to use certain features of our website.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">4. Google AdSense and Advertising</h2>
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
          <p className="mb-3">
            <strong>Important:</strong> We use Google AdSense to display advertisements on our website.
            Google AdSense uses cookies and web beacons to serve ads based on your visits to this
            site and other sites on the Internet.
          </p>
        </div>

        <h3 className="text-xl font-semibold mt-6 mb-3">4.1 How Google AdSense Works</h3>
        <p className="mb-4">
          Google uses cookies to:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Serve ads based on your prior visits to our website or other websites</li>
          <li>Measure ad effectiveness and provide aggregated reports</li>
          <li>Prevent the same ads from being shown to you repeatedly</li>
          <li>Detect and prevent click fraud</li>
        </ul>

        <h3 className="text-xl font-semibold mt-6 mb-3">4.2 Your Advertising Choices</h3>
        <p className="mb-4">
          You can opt out of personalized advertising by visiting:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>
            <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Google Ads Settings
            </a>
          </li>
          <li>
            <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Digital Advertising Alliance (DAA) Opt-Out
            </a>
          </li>
          <li>
            <a href="https://youradchoices.ca/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Your Ad Choices (Canada)
            </a>
          </li>
        </ul>
        <p className="mb-4">
          For more information about how Google uses data when you use our website, please visit{' '}
          <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            How Google uses information from sites or apps that use our services
          </a>.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">5. Google Analytics</h2>
        <p className="mb-4">
          We use Google Analytics to analyze website traffic and usage patterns. Google Analytics
          uses cookies to collect information such as:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>How often users visit our site</li>
          <li>What pages they visit</li>
          <li>What other sites they used prior to coming to our site</li>
        </ul>
        <p className="mb-4">
          Google Analytics collects only the IP address assigned to you on the date you visit our site,
          not your name or other identifying information. We do not combine the information collected
          through Google Analytics with personally identifiable information.
        </p>
        <p className="mb-4">
          You can opt out of Google Analytics by installing the{' '}
          <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Google Analytics Opt-out Browser Add-on
          </a>.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">6. Third-Party Services</h2>
        <p className="mb-4">
          Our website may contain links to third-party websites and services. We are not responsible
          for the privacy practices or content of these third-party sites. We encourage you to review
          the privacy policies of any third-party sites you visit.
        </p>
        <p className="mb-4">
          Third-party services we use include:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li><strong>Google AdSense:</strong> For displaying advertisements</li>
          <li><strong>Google Analytics:</strong> For website analytics</li>
          <li><strong>Vercel Analytics:</strong> For performance monitoring</li>
          <li><strong>Supabase:</strong> For data storage and management</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">7. Data Security</h2>
        <p className="mb-4">
          We implement appropriate technical and organizational security measures to protect your
          personal information against unauthorized access, alteration, disclosure, or destruction.
          However, no method of transmission over the Internet or electronic storage is 100% secure,
          and we cannot guarantee absolute security.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">8. Your Rights (GDPR Compliance)</h2>
        <p className="mb-4">
          If you are a resident of the European Economic Area (EEA), you have certain data protection
          rights under the General Data Protection Regulation (GDPR):
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li><strong>Right to Access:</strong> You can request a copy of the personal data we hold about you</li>
          <li><strong>Right to Rectification:</strong> You can request that we correct inaccurate or incomplete data</li>
          <li><strong>Right to Erasure:</strong> You can request that we delete your personal data</li>
          <li><strong>Right to Restrict Processing:</strong> You can request that we limit how we use your data</li>
          <li><strong>Right to Data Portability:</strong> You can request a copy of your data in a machine-readable format</li>
          <li><strong>Right to Object:</strong> You can object to our processing of your personal data</li>
          <li><strong>Right to Withdraw Consent:</strong> You can withdraw your consent at any time</li>
        </ul>
        <p className="mb-4">
          To exercise any of these rights, please contact us at{' '}
          <a href="mailto:culturealberta101@gmail.com" className="text-blue-600 hover:underline">
            culturealberta101@gmail.com
          </a>.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">9. Canadian Privacy Rights (PIPEDA)</h2>
        <p className="mb-4">
          As a Canadian organization, we comply with the Personal Information Protection and Electronic
          Documents Act (PIPEDA). You have the right to:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Know what personal information we collect and how we use it</li>
          <li>Access your personal information</li>
          <li>Challenge the accuracy and completeness of your information</li>
          <li>Withdraw consent for the collection, use, or disclosure of your information</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">10. Children's Privacy</h2>
        <p className="mb-4">
          Our website is not intended for children under the age of 13. We do not knowingly collect
          personal information from children under 13. If you believe we have collected information
          from a child under 13, please contact us immediately.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">11. Newsletter and Email Communications</h2>
        <p className="mb-4">
          If you subscribe to our newsletter, we will use your email address to send you updates
          about Alberta culture, events, and related content. You can unsubscribe at any time by:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Clicking the "unsubscribe" link in any email we send</li>
          <li>Contacting us at <a href="mailto:culturealberta101@gmail.com" className="text-blue-600 hover:underline">culturealberta101@gmail.com</a></li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">12. Data Retention</h2>
        <p className="mb-4">
          We retain your personal information only for as long as necessary to fulfill the purposes
          outlined in this Privacy Policy, unless a longer retention period is required or permitted
          by law.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">13. Changes to This Privacy Policy</h2>
        <p className="mb-4">
          We may update this Privacy Policy from time to time. We will notify you of any changes by
          posting the new Privacy Policy on this page and updating the "Last updated" date. We
          encourage you to review this Privacy Policy periodically for any changes.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">14. Contact Us</h2>
        <p className="mb-4">
          If you have any questions about this Privacy Policy or our privacy practices, please contact us:
        </p>
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <p className="mb-2">
            <strong>Email:</strong>{' '}
            <a href="mailto:culturealberta101@gmail.com" className="text-blue-600 hover:underline">
              culturealberta101@gmail.com
            </a>
          </p>
          <p className="mb-2">
            <strong>Phone:</strong>{' '}
            <a href="tel:+12262361828" className="text-blue-600 hover:underline">
              (226) 236-1828
            </a>
          </p>
          <p>
            <strong>Location:</strong> Alberta, Canada
          </p>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mt-8">
          <p className="text-sm">
            <strong>Note:</strong> By using our website, you consent to this Privacy Policy and
            agree to its terms. If you do not agree with this policy, please do not use our website.
          </p>
        </div>
      </div>
    </div>
  )
}
