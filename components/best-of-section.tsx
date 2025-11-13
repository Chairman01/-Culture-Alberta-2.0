"use client"

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export function BestOfSection() {
  const [activeBestOfTab, setActiveBestOfTab] = useState('dentists')

  return (
    <section className="w-full py-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-6">
          <h2 className="font-display text-4xl font-bold mb-3">Best of Alberta</h2>
          <p className="font-body text-gray-600 max-w-[600px] mx-auto text-lg leading-relaxed">
            Discover the top-rated professionals and businesses across Alberta, from healthcare providers to legal services.
          </p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button 
              className={`px-6 py-3 text-sm font-medium font-body transition-colors ${
                activeBestOfTab === 'dentists' 
                  ? 'text-black border-b-2 border-black' 
                  : 'text-gray-600 hover:text-black'
              }`}
              onClick={() => setActiveBestOfTab('dentists')}
            >
              Dentists
            </button>
            <button 
              className={`px-6 py-3 text-sm font-medium font-body transition-colors ${
                activeBestOfTab === 'lawyers' 
                  ? 'text-black border-b-2 border-black' 
                  : 'text-gray-600 hover:text-black'
              }`}
              onClick={() => setActiveBestOfTab('lawyers')}
            >
              Lawyers
            </button>
            <button 
              className={`px-6 py-3 text-sm font-medium font-body transition-colors ${
                activeBestOfTab === 'accountants' 
                  ? 'text-black border-b-2 border-black' 
                  : 'text-gray-600 hover:text-black'
              }`}
              onClick={() => setActiveBestOfTab('accountants')}
            >
              Accountants
            </button>
            <button 
              className={`px-6 py-3 text-sm font-medium font-body transition-colors ${
                activeBestOfTab === 'restaurants' 
                  ? 'text-black border-b-2 border-black' 
                  : 'text-gray-600 hover:text-black'
              }`}
              onClick={() => setActiveBestOfTab('restaurants')}
            >
              Restaurants
            </button>
          </div>
          <Link href="/best-of" className="ml-6 text-blue-600 hover:text-blue-700 flex items-center gap-2 font-body font-medium">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Best of Content */}
        <div className="max-w-md mx-auto">
          <div className="bg-gray-200 rounded-xl p-6 text-center">
            <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">📧</span>
            </div>
            <p className="font-body text-gray-600">
              {activeBestOfTab === 'dentists' && "Providing exceptional dental care for the whole family."}
              {activeBestOfTab === 'lawyers' && "Expert legal services for all your needs."}
              {activeBestOfTab === 'accountants' && "Professional accounting and tax services."}
              {activeBestOfTab === 'restaurants' && "Discover the best dining experiences in Alberta."}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}