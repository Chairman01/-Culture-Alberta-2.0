/**
 * Convert Witch Perfect Article to Event
 * 
 * This script converts the existing Witch Perfect article to a proper event
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function convertWitchPerfectToEvent() {
  try {
    console.log('🔄 Converting Witch Perfect article to event...')
    
    // Read the current fallback file
    const fallbackPath = path.join(__dirname, '..', 'optimized-fallback.json')
    const fallbackData = fs.readFileSync(fallbackPath, 'utf8')
    const articles = JSON.parse(fallbackData)
    
    // Find the Witch Perfect article
    const witchPerfectIndex = articles.findIndex(article => 
      article.id === 'article-1761018484691-5zhcchkpm'
    )
    
    if (witchPerfectIndex === -1) {
      console.error('❌ Witch Perfect article not found')
      return
    }
    
    console.log('✅ Found Witch Perfect article, converting to event...')
    
    // Create the event object with all the details you provided
    const event = {
      id: 'event-witch-perfect-for-good-2025',
      title: 'Witch Perfect: For Good — A Wickedly Delicious Dining Experience Coming to Calgary',
      description: `We're Not in Kansas Anymore…

Calgary is about to go full Wicked! This November, Canada's Broadway Diner invites you to an unforgettable morning of magic, music, and mischief with Witch Perfect: For Good – A Wickedly Delicious Dining Experience, hosted at the iconic Trolley 5 Brewpub.

This family-friendly Broadway brunch transforms your Saturday into a whimsical journey down the yellow brick road — where pancakes meet powerhouse vocals and every moment sparkles with Oz-inspired fun.

About the Show

Join stars Megan Kerrigan and Lyndsey Paterson, who find themselves swept away from their everyday restaurant routines into a world of enchantment and melody. Along the way, they're joined by special guests Tanis Jaylene and Brad Hawkins, creating a performance that blends Wicked, The Wizard of Oz, and other Broadway favorites into one spectacular show.

Expect dazzling vocals, audience participation, and themed fun for all ages — it's an event that's equal parts brunch and Broadway. With Wicked: For Good hitting theatres on November 21st, this show is your perfect prequel to the big screen premiere.

"It's a brunch that's simply delicioucious," says Canada's Broadway Diner team. "We want guests to laugh, sing, and celebrate together in true Oz fashion."

What's Included

✨ A Wickedly fun live show featuring songs from Wicked, The Wizard of Oz, and beyond
👗 Costume contest — dress in your Oz best (Glinda sparkle, Elphaba green, or anything in between!)
🎶 "Finish That Lyric" game
💃 Dance contest — bust out your Ozdust moves
🏆 Prizes and keepsakes to take home
📸 Photos with performers in full Wicked spirit
🎨 Coloring sheets for kids
🍹 Themed drinks for adults & all ages

Brunch Menu

Regular Pancake Breakfast
- In-house made pancakes with maple syrup
- Bacon
- Side tots
- Scrambled eggs
- Fruit bowl

Vegan Pancakes with Tofu Scramble (Pre-order only)
- Vegan pancakes with maple syrup
- Scrambled tofu eggs
- Fresh fruit

Gluten-Free Pancakes (Pre-order only)
- Gluten-free pancakes with maple syrup
- Bacon
- Side tots (may contain cross-contamination via fryer)
- Fresh fruit

Accessibility

Trolley 5 Brewpub is fully wheelchair accessible and equipped with an elevator, ensuring every guest can enjoy the performance comfortably.

⚠️ Note: This show contains spoilers for Wicked: For Good, in theatres November 21st.`,
      excerpt: "We're Not in Kansas Anymore… Calgary is about to go full Wicked! This November, Canada's Broadway Diner invites you to an unforgettable morning of ma...",
      category: 'Culture',
      subcategory: 'Food & Entertainment',
      location: 'Calgary',
      venue: 'Trolley 5 Brewpub',
      venue_address: 'Trolley 5 Brewpub, Calgary, AB',
      organizer: 'Witch Perfect',
      organizer_contact: 'Canada\'s Broadway Diner',
      event_date: '2025-11-01T12:00:00.000Z',
      event_end_date: '2025-11-01T15:00:00.000Z',
      price: 0, // Free event
      currency: 'CAD',
      capacity: 100,
      current_attendees: 0,
      image_url: articles[witchPerfectIndex].imageUrl,
      website_url: '#',
      facebook_url: '#',
      instagram_url: '#',
      twitter_url: '#',
      tags: ['Broadway', 'Brunch', 'Family-Friendly', 'Wicked', 'The Wizard of Oz', 'Calgary', 'Entertainment'],
      status: 'published',
      featured: true,
      featured_home: true,
      featured_edmonton: false,
      featured_calgary: true,
      age_restriction: 'All Ages',
      accessibility_info: 'Trolley 5 Brewpub is fully wheelchair accessible and equipped with an elevator',
      parking_info: 'Parking available at venue',
      what_to_bring: 'Dress in your Oz best (Glinda sparkle, Elphaba green, or anything in between!)',
      dress_code: 'Oz-themed costumes encouraged',
      created_at: '2025-10-21T03:48:04.692+00:00',
      updated_at: new Date().toISOString(),
      type: 'event',
      date: '2025-11-01T12:00:00.000Z',
      imageUrl: articles[witchPerfectIndex].imageUrl,
      trendingHome: false,
      trendingEdmonton: false,
      trendingCalgary: true,
      featuredHome: true,
      featuredEdmonton: false,
      featuredCalgary: true,
      createdAt: '2025-10-21T03:48:04.692+00:00',
      updatedAt: new Date().toISOString()
    }
    
    // Replace the article with the event
    articles[witchPerfectIndex] = event
    
    // Write back to file
    fs.writeFileSync(fallbackPath, JSON.stringify(articles, null, 2))
    
    console.log('✅ Successfully converted Witch Perfect article to event!')
    console.log('📅 Event Date: November 1, 2025 at 12:00 PM')
    console.log('📍 Location: Trolley 5 Brewpub, Calgary')
    console.log('🎭 Type: Broadway Brunch Experience')
    console.log('👥 Capacity: 100 people')
    console.log('💰 Price: Free')
    
  } catch (error) {
    console.error('❌ Conversion failed:', error)
  }
}

// Run the conversion
convertWitchPerfectToEvent()
