export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      
      <div className="prose max-w-none">
        <p className="mb-4">
          <strong>Last updated:</strong> {new Date().toLocaleDateString()}
        </p>
        
        <h2 className="text-2xl font-semibold mt-6 mb-4">Information We Collect</h2>
        <p className="mb-4">
          Culture Alberta collects information you provide directly to us, such as when you create an account, 
          subscribe to our newsletter, or contact us for support.
        </p>
        
        <h2 className="text-2xl font-semibold mt-6 mb-4">How We Use Your Information</h2>
        <p className="mb-4">
          We use the information we collect to provide, maintain, and improve our services, 
          communicate with you, and personalize your experience.
        </p>
        
        <h2 className="text-2xl font-semibold mt-6 mb-4">Cookies and Tracking</h2>
        <p className="mb-4">
          We use cookies and similar tracking technologies to enhance your experience on our website 
          and to analyze our traffic. We also use Google Analytics and Google AdSense.
        </p>
        
        <h2 className="text-2xl font-semibold mt-6 mb-4">Third-Party Services</h2>
        <p className="mb-4">
          Our website uses Google AdSense for advertising. Google may use cookies to serve ads 
          based on your visits to this site and other sites on the Internet.
        </p>
        
        <h2 className="text-2xl font-semibold mt-6 mb-4">Contact Us</h2>
        <p className="mb-4">
          If you have any questions about this Privacy Policy, please contact us at 
          <a href="mailto:contact@culturealberta.com" className="text-blue-600 hover:underline">
            contact@culturealberta.com
          </a>
        </p>
      </div>
    </div>
  )
}
