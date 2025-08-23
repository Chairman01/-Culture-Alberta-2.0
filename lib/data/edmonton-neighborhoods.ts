export interface EdmontonNeighborhood {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  location: string;
  imageUrl?: string;
  content: string;
  tags: string[];
  featuredEdmonton: boolean;
  trendingEdmonton: boolean;
}

export const edmontonNeighborhoods: EdmontonNeighborhood[] = [
  {
    id: 'whyte-avenue-edmonton',
    name: 'Whyte Avenue',
    slug: 'whyte-avenue',
    description: 'Historic district known for its vibrant arts scene, boutique shopping, and nightlife.',
    category: 'Edmonton Neighborhoods',
    location: 'Edmonton',
    imageUrl: '/placeholder.svg',
    content: `# Whyte Avenue: Edmonton's Cultural Heart

## What it is:
Whyte Avenue (82nd Avenue) is Edmonton's most vibrant and eclectic neighborhood, known for its historic charm, diverse dining scene, and thriving arts community.

## Why locals love it:
- **Historic Architecture**: Beautiful heritage buildings dating back to the early 1900s
- **Arts & Culture**: Home to numerous galleries, theaters, and cultural venues
- **Unique Shopping**: Independent boutiques, vintage stores, and specialty shops
- **Diverse Dining**: From food trucks to fine dining, representing cuisines from around the world
- **Nightlife**: Bustling bars, live music venues, and entertainment options

## Pro tip:
Visit during the Edmonton International Fringe Theatre Festival in August for the ultimate Whyte Avenue experience.

## Must-try:
- **Café Bicyclette**: French-inspired café with excellent pastries
- **The Next Act Pub**: Local favorite for craft beer and pub fare
- **Whyte Avenue Art Walk**: Monthly art gallery tours
- **Old Strathcona Farmers' Market**: Year-round market with local vendors

## Vibe:
Eclectic, artistic, and community-focused with a mix of students, artists, and families.

## Heads-up:
Parking can be challenging on weekends - consider taking the LRT or cycling.`,
    tags: ['Whyte Avenue', 'Edmonton', 'Arts', 'Shopping', 'Dining', 'Nightlife'],
    featuredEdmonton: true,
    trendingEdmonton: true
  },
  {
    id: 'downtown-edmonton',
    name: 'Downtown Edmonton',
    slug: 'downtown',
    description: 'The heart of the city featuring modern architecture, cultural venues, and dining options.',
    category: 'Edmonton Neighborhoods',
    location: 'Edmonton',
    imageUrl: '/placeholder.svg',
    content: `# Downtown Edmonton: The Urban Core

## What it is:
Downtown Edmonton is the city's business and cultural center, featuring modern skyscrapers, government buildings, and world-class entertainment venues.

## Why locals love it:
- **River Valley Access**: Direct connection to North America's largest urban parkland
- **Cultural Institutions**: Art Gallery of Alberta, Winspear Centre, and Royal Alberta Museum
- **Professional Sports**: Rogers Place for Oilers hockey and major concerts
- **Government & Business**: Provincial legislature and major corporate headquarters
- **Festival District**: Home to major events like the Edmonton Folk Music Festival

## Pro tip:
Take the funicular down to the river valley for stunning views and walking trails.

## Must-try:
- **Art Gallery of Alberta**: Contemporary and historical art exhibitions
- **Rogers Place**: Catch an Oilers game or major concert
- **Churchill Square**: Central gathering place for events and festivals
- **Jasper Avenue**: Main street with shopping, dining, and entertainment

## Vibe:
Professional, modern, and energetic with a mix of business and entertainment.

## Heads-up:
Downtown can be quiet on weekends outside of major events - check what's happening before visiting.`,
    tags: ['Downtown', 'Edmonton', 'Business', 'Culture', 'Sports', 'River Valley'],
    featuredEdmonton: false,
    trendingEdmonton: true
  },
  {
    id: 'old-strathcona-edmonton',
    name: 'Old Strathcona',
    slug: 'old-strathcona',
    description: 'A charming historic district with theaters, independent shops, and farmers\' market.',
    category: 'Edmonton Neighborhoods',
    location: 'Edmonton',
    imageUrl: '/placeholder.svg',
    content: `# Old Strathcona: Historic Charm

## What it is:
Old Strathcona is Edmonton's most historic neighborhood, preserving the city's early 20th-century character with restored buildings and cobblestone streets.

## Why locals love it:
- **Historic Preservation**: Beautifully restored heritage buildings and architecture
- **Theater District**: Home to numerous theaters and performing arts venues
- **Independent Businesses**: Unique shops, galleries, and locally-owned restaurants
- **Farmers' Market**: Year-round market with local produce and artisanal goods
- **Community Feel**: Strong sense of history and community pride

## Pro tip:
Visit during the Old Strathcona Antique Mall's monthly sales for great vintage finds.

## Must-try:
- **Old Strathcona Farmers' Market**: Year-round indoor market
- **Varscona Theatre**: Intimate theater productions
- **Antique Shops**: Numerous vintage and antique stores
- **Historic Walking Tours**: Learn about the area's rich history

## Vibe:
Charming, historic, and community-oriented with a focus on local businesses.

## Heads-up:
The area can be busy during market days and theater performances - plan accordingly.`,
    tags: ['Old Strathcona', 'Edmonton', 'Historic', 'Theater', 'Antiques', 'Farmers Market'],
    featuredEdmonton: false,
    trendingEdmonton: false
  },
  {
    id: '124-street-edmonton',
    name: '124 Street',
    slug: '124-street',
    description: 'Trendy area with art galleries, specialty shops, and upscale restaurants.',
    category: 'Edmonton Neighborhoods',
    location: 'Edmonton',
    imageUrl: '/placeholder.svg',
    content: `# 124 Street: The Art District

## What it is:
124 Street is Edmonton's premier arts and design district, featuring galleries, specialty shops, and upscale dining in a trendy, walkable neighborhood.

## Why locals love it:
- **Art Galleries**: Numerous contemporary and fine art galleries
- **Design Shops**: Furniture, home décor, and specialty retail
- **Upscale Dining**: Fine dining restaurants and trendy cafés
- **Walkable**: Compact, pedestrian-friendly area perfect for browsing
- **Creative Community**: Home to many artists, designers, and creative professionals

## Pro tip:
Visit during the 124 Street Grand Market on Thursdays for local vendors and food trucks.

## Must-try:
- **Art Galleries**: Explore contemporary and fine art
- **Specialty Shops**: Unique home décor and design stores
- **Upscale Restaurants**: Fine dining and trendy eateries
- **Coffee Shops**: Independent cafés with great atmosphere

## Vibe:
Sophisticated, artistic, and trendy with a focus on quality and creativity.

## Heads-up:
This is an upscale area - expect higher prices for dining and shopping.`,
    tags: ['124 Street', 'Edmonton', 'Art', 'Design', 'Upscale', 'Galleries'],
    featuredEdmonton: false,
    trendingEdmonton: true
  }
];

export function getEdmontonNeighborhoods(): EdmontonNeighborhood[] {
  return edmontonNeighborhoods;
}

export function getEdmontonNeighborhoodBySlug(slug: string): EdmontonNeighborhood | undefined {
  return edmontonNeighborhoods.find(neighborhood => neighborhood.slug === slug);
}
