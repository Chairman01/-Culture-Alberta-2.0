/**
 * Optimized About Page
 * 
 * Performance optimizations:
 * - Uses Next.js Image component for optimized images
 * - Static page generation (no data fetching needed)
 * - Proper SEO metadata
 * - Accessible markup
 * - No console.logs
 * 
 * Used as: About page route (/about)
 */

import Image from 'next/image'
import Link from 'next/link'
import { PageSEO } from '@/components/seo/page-seo'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Us - Culture Alberta',
  description: 'Learn about Culture Alberta\'s mission to celebrate and preserve Alberta\'s rich cultural heritage through stories, events, and community connections.',
  keywords: ['Culture Alberta', 'Alberta culture', 'cultural heritage', 'Alberta events', 'cultural preservation'],
  openGraph: {
    title: 'About Us - Culture Alberta',
    description: 'Celebrating and preserving Alberta\'s rich cultural heritage through stories, events, and community connections.',
    type: 'website',
    url: 'https://www.culturealberta.com/about',
  },
}

/**
 * About Page Component
 * 
 * Displays information about Culture Alberta's mission, vision, and goals
 */
export default function AboutPage() {
  return (
    <>
      <PageSEO
        title="About Us - Culture Alberta"
        description="Learn about Culture Alberta's mission to celebrate and preserve Alberta's rich cultural heritage through stories, events, and community connections."
      />
      <div className="flex min-h-screen flex-col">
        <main className="flex-1">
          {/* Hero Section */}
          <section className="w-full py-6 bg-muted/30">
            <div className="container px-4 md:px-6">
              <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">About Culture Alberta</h1>
                  <p className="max-w-[900px] text-muted-foreground md:text-xl">
                    Celebrating and preserving Alberta's rich cultural heritage through stories, events, and community connections.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Mission Section */}
          <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/40">
            <div className="container px-4 md:px-6">
              <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
                <div>
                  <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">Our Mission</h2>
                  <p className="mt-4 text-lg text-muted-foreground">
                    Culture Alberta is dedicated to documenting, preserving, and celebrating the diverse cultural heritage
                    of Alberta. We believe that understanding our shared cultural history is essential for building a more
                    inclusive and vibrant future.
                  </p>
                  <p className="mt-4 text-lg text-muted-foreground">
                    Through our articles, events, and community initiatives, we aim to:
                  </p>
                  <ul className="mt-4 grid gap-3 text-lg text-muted-foreground">
                    <li className="flex items-start">
                      <CheckIcon className="mr-2 mt-1 h-5 w-5 flex-shrink-0 text-primary" aria-hidden="true" />
                      <span>Document and share stories about Alberta's cultural heritage</span>
                    </li>
                    <li className="flex items-start">
                      <CheckIcon className="mr-2 mt-1 h-5 w-5 flex-shrink-0 text-primary" aria-hidden="true" />
                      <span>Promote understanding and appreciation of Alberta's diverse cultural traditions</span>
                    </li>
                    <li className="flex items-start">
                      <CheckIcon className="mr-2 mt-1 h-5 w-5 flex-shrink-0 text-primary" aria-hidden="true" />
                      <span>Support cultural practitioners and organizations across the province</span>
                    </li>
                    <li className="flex items-start">
                      <CheckIcon className="mr-2 mt-1 h-5 w-5 flex-shrink-0 text-primary" aria-hidden="true" />
                      <span>Foster connections between different cultural communities</span>
                    </li>
                  </ul>
                </div>
                <div className="space-y-4">
                  <div className="relative aspect-video w-full overflow-hidden rounded-xl">
                    <Image
                      src="/images/calgary-culture.jpg"
                      alt="Alberta cultural heritage"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      priority
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gray-100">
                      <Image
                        src="/images/edmonton-culture.svg"
                        alt="Edmonton culture"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    </div>
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gray-100">
                      <Image
                        src="/images/calgary-culture.svg"
                        alt="Calgary culture"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Vision Section */}
          <section className="w-full py-12 md:py-24 lg:py-32">
            <div className="container px-4 md:px-6">
              <div className="mx-auto max-w-3xl space-y-8">
                <div className="space-y-2 text-center">
                  <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">Our Vision</h2>
                </div>
                <div className="space-y-4 text-lg text-muted-foreground">
                  <p>
                    We envision an Alberta where every community's cultural heritage is celebrated, preserved, and shared. 
                    A province where cultural diversity is not just acknowledged but actively embraced as a source of strength 
                    and connection.
                  </p>
                  <p>
                    Our vision extends beyond documentation—we strive to create a living, breathing cultural ecosystem 
                    where traditions are passed down, new expressions are nurtured, and cultural exchange flourishes 
                    across all communities.
                  </p>
                  <p>
                    We believe that by honoring our past while embracing our present, we can build a more inclusive, 
                    understanding, and vibrant future for all Albertans.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Plans & Goals Section */}
          <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/40">
            <div className="container px-4 md:px-6">
              <div className="mx-auto max-w-3xl space-y-8">
                <div className="space-y-2 text-center">
                  <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">Our Plans & Goals</h2>
                </div>
                <div className="grid gap-8 md:grid-cols-2">
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold">Content & Storytelling</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Expand our article library with more diverse cultural perspectives</li>
                      <li>• Launch video content featuring cultural practitioners and events</li>
                      <li>• Create interactive maps of cultural sites and heritage locations</li>
                      <li>• Develop educational resources for schools and community groups</li>
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold">Community Engagement</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Host regular cultural events and workshops across Alberta</li>
                      <li>• Partner with local cultural organizations and communities</li>
                      <li>• Create mentorship programs for emerging cultural leaders</li>
                      <li>• Establish cultural exchange programs between communities</li>
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold">Digital Innovation</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Develop a mobile app for cultural discovery and events</li>
                      <li>• Create virtual reality experiences of cultural sites</li>
                      <li>• Launch a podcast series featuring cultural stories</li>
                      <li>• Build an online marketplace for cultural artisans</li>
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold">Preservation & Research</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Digitize and preserve historical cultural materials</li>
                      <li>• Conduct oral history interviews with cultural elders</li>
                      <li>• Research and document endangered cultural practices</li>
                      <li>• Create a comprehensive cultural heritage database</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Get Involved Section */}
          <section className="w-full py-12 md:py-24 lg:py-32">
            <div className="container px-4 md:px-6">
              <div className="mx-auto max-w-3xl space-y-8">
                <div className="space-y-2 text-center">
                  <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">Get Involved</h2>
                  <p className="text-muted-foreground md:text-xl">
                    Join us in celebrating and preserving Alberta's cultural heritage.
                  </p>
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <CheckIcon className="text-primary w-6 h-6" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-bold">Share Your Story</h3>
                    <p className="text-muted-foreground">
                      Contribute articles, photos, or videos about your cultural heritage and experiences.
                    </p>
                  </div>
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <CheckIcon className="text-primary w-6 h-6" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-bold">Attend Events</h3>
                    <p className="text-muted-foreground">
                      Join our cultural events, workshops, and community gatherings across Alberta.
                    </p>
                  </div>
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <CheckIcon className="text-primary w-6 h-6" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-bold">Support Our Mission</h3>
                    <p className="text-muted-foreground">
                      Help us continue our work through donations, partnerships, or volunteering.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Contact Section */}
          <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/40">
            <div className="container px-4 md:px-6">
              <div className="mx-auto max-w-3xl space-y-8">
                <div className="space-y-2 text-center">
                  <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">Contact Us</h2>
                  <p className="text-muted-foreground md:text-xl">
                    Have questions or want to get involved? We'd love to hear from you.
                  </p>
                </div>
                <div className="grid gap-8 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold">Get in Touch</h3>
                      <p className="text-muted-foreground">
                        Email us at{" "}
                        <a href="mailto:culturealberta101@gmail.com" className="text-primary hover:underline">
                          culturealberta101@gmail.com
                        </a>
                      </p>
                      <p className="text-muted-foreground">
                        Call us at{" "}
                        <a href="tel:+12262361828" className="text-primary hover:underline">
                          (226) 236-1828
                        </a>
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold">Office Location</h3>
                      <p className="text-muted-foreground">123 Heritage Avenue</p>
                      <p className="text-muted-foreground">Calgary, AB T2P 2M5</p>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold">Follow Us</h3>
                      <div className="flex gap-4">
                        <SocialLink 
                          href="https://www.youtube.com/@CultureAlberta_" 
                          label="YouTube - Culture Alberta"
                          icon="youtube"
                        />
                        <SocialLink 
                          href="https://www.facebook.com/profile.php?id=100064044099295" 
                          label="Facebook - Culture Alberta"
                          icon="facebook"
                        />
                        <SocialLink 
                          href="https://www.facebook.com/profile.php?id=100072301249690" 
                          label="Facebook - Culture YYC"
                          icon="facebook"
                        />
                        <SocialLink 
                          href="https://www.instagram.com/culturealberta._/" 
                          label="Instagram - Culture Alberta"
                          icon="instagram"
                        />
                        <SocialLink 
                          href="https://www.instagram.com/cultureyyc._/" 
                          label="Instagram - Culture YYC"
                          icon="instagram"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold">Send Us a Message</h3>
                      <p className="text-muted-foreground">
                        Visit our <Link href="/contact" className="text-primary hover:underline">contact page</Link> to send us a message.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  )
}

/**
 * Check Icon Component
 * Reusable checkmark icon for lists
 */
function CheckIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

/**
 * Social Link Component
 * 
 * @param href - Social media URL
 * @param label - Accessibility label
 * @param icon - Icon type (youtube, facebook, instagram)
 */
function SocialLink({ 
  href, 
  label, 
  icon 
}: { 
  href: string
  label: string
  icon: 'youtube' | 'facebook' | 'instagram'
}) {
  return (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center rounded-md border border-input bg-background h-10 w-10 hover:bg-accent hover:text-accent-foreground transition-colors"
      aria-label={label}
    >
      {icon === 'youtube' && <YouTubeIcon />}
      {icon === 'facebook' && <FacebookIcon />}
      {icon === 'instagram' && <InstagramIcon />}
    </a>
  )
}

function YouTubeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}
