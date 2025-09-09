export default function TermsOfService() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      
      <div className="prose max-w-none">
        <p className="mb-4">
          <strong>Last updated:</strong> {new Date().toLocaleDateString()}
        </p>
        
        <h2 className="text-2xl font-semibold mt-6 mb-4">Acceptance of Terms</h2>
        <p className="mb-4">
          By accessing and using Culture Alberta, you accept and agree to be bound by the terms 
          and provision of this agreement.
        </p>
        
        <h2 className="text-2xl font-semibold mt-6 mb-4">Use License</h2>
        <p className="mb-4">
          Permission is granted to temporarily download one copy of the materials on Culture Alberta 
          for personal, non-commercial transitory viewing only.
        </p>
        
        <h2 className="text-2xl font-semibold mt-6 mb-4">Content Accuracy</h2>
        <p className="mb-4">
          While we strive to provide accurate and up-to-date information about Alberta's culture, 
          events, and attractions, we cannot guarantee the accuracy of all information.
        </p>
        
        <h2 className="text-2xl font-semibold mt-6 mb-4">User Conduct</h2>
        <p className="mb-4">
          Users are prohibited from using the site for any unlawful purpose or any purpose 
          prohibited under this clause.
        </p>
        
        <h2 className="text-2xl font-semibold mt-6 mb-4">Limitation of Liability</h2>
        <p className="mb-4">
          In no event shall Culture Alberta or its suppliers be liable for any damages arising 
          out of the use or inability to use the materials on Culture Alberta.
        </p>
        
        <h2 className="text-2xl font-semibold mt-6 mb-4">Contact Information</h2>
        <p className="mb-4">
          If you have any questions about these Terms of Service, please contact us at 
          <a href="mailto:contact@culturealberta.com" className="text-blue-600 hover:underline">
            contact@culturealberta.com
          </a>
        </p>
      </div>
    </div>
  )
}
