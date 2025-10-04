import { Mail, Phone, MapPin, Clock } from 'lucide-react'

export default function ContactPage() {
  return (
    <>
      
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                Get in Touch
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Have questions about Alberta's culture scene? Want to collaborate or share a story? 
                We'd love to hear from you.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              
              {/* Contact Details */}
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-6">
                    Contact Information
                  </h2>
                  <p className="text-lg text-gray-600 mb-8">
                    Reach out to us for collaborations, story ideas, or general inquiries about Alberta's vibrant cultural scene.
                  </p>
                </div>

                {/* Email */}
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Mail className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Email</h3>
                    <a 
                      href="mailto:culturemedia101@gmail.com" 
                      className="text-blue-600 hover:text-blue-700 transition-colors text-lg"
                    >
                      culturemedia101@gmail.com
                    </a>
                    <p className="text-gray-600 mt-1">
                      We typically respond within 24 hours
                    </p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Phone className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Phone</h3>
                    <a 
                      href="tel:+12262361828" 
                      className="text-green-600 hover:text-green-700 transition-colors text-lg"
                    >
                      (226) 236-1828
                    </a>
                    <p className="text-gray-600 mt-1">
                      Available Monday to Friday, 9 AM - 5 PM MST
                    </p>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Location</h3>
                    <p className="text-gray-700 text-lg">
                      Alberta, Canada
                    </p>
                    <p className="text-gray-600 mt-1">
                      Covering the entire province
                    </p>
                  </div>
                </div>

                {/* Hours */}
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Business Hours</h3>
                    <p className="text-gray-700 text-lg">
                      Monday - Friday
                    </p>
                    <p className="text-gray-600 mt-1">
                      9:00 AM - 5:00 PM MST
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Form Placeholder */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  Quick Message
                </h3>
                <p className="text-gray-600 mb-6">
                  For immediate assistance, please use our contact information above. 
                  We're here to help with:
                </p>
                
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-700">Story submissions and collaborations</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-700">Event coverage requests</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-700">Partnership opportunities</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-700">General inquiries</span>
                  </li>
                </ul>

                <div className="bg-blue-50 rounded-lg p-6">
                  <h4 className="font-semibold text-blue-900 mb-2">Need immediate help?</h4>
                  <p className="text-blue-700 text-sm">
                    Call us at <a href="tel:+12262361828" className="font-semibold hover:underline">(226) 236-1828</a> or email us at{' '}
                    <a href="mailto:culturemedia101@gmail.com" className="font-semibold hover:underline">culturemedia101@gmail.com</a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="bg-white border-t border-gray-200">
          <div className="container mx-auto px-4 py-12">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Let's Connect
              </h2>
              <p className="text-gray-600 mb-6">
                Whether you're a local business, event organizer, or cultural enthusiast, 
                we're always excited to hear from our community.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="mailto:culturemedia101@gmail.com"
                  className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  Send us an email
                </a>
                <a 
                  href="tel:+12262361828"
                  className="inline-flex items-center justify-center px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Call us now
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
