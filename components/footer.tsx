import Link from "next/link"

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">Culture Alberta</h3>
            <p className="text-gray-600 text-sm">
              Your guide to Alberta's best culture, events, and experiences.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Explore</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/edmonton" className="text-gray-600 hover:text-gray-900">Edmonton</Link></li>
              <li><Link href="/calgary" className="text-gray-600 hover:text-gray-900">Calgary</Link></li>
              <li><Link href="/events" className="text-gray-600 hover:text-gray-900">Events</Link></li>
              <li><Link href="/food-drink" className="text-gray-600 hover:text-gray-900">Food & Drink</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="text-gray-600 hover:text-gray-900">About Us</Link></li>
              <li><Link href="/contact" className="text-gray-600 hover:text-gray-900">Contact</Link></li>
              <li><Link href="/partner" className="text-gray-600 hover:text-gray-900">Partner with Us</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/privacy-policy" className="text-gray-600 hover:text-gray-900">Privacy Policy</Link></li>
              <li><Link href="/terms-of-service" className="text-gray-600 hover:text-gray-900">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t mt-8 pt-8 text-center text-sm text-gray-600">
          <p>&copy; 2024 Culture Alberta. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}