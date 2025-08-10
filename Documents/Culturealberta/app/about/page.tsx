import Link from "next/link"
import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <section className="w-full py-6 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">About Us</h1>
                <p className="max-w-[900px] text-muted-foreground md:text-xl">
                  Learn about our mission to celebrate and preserve Alberta's cultural heritage.
                </p>
              </div>
            </div>
          </div>
        </section>
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
                      className="mr-2 mt-1 h-5 w-5 flex-shrink-0 text-primary"
                    >
                      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                    Document and share stories about Alberta's cultural heritage
                  </li>
                  <li className="flex items-start">
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
                      className="mr-2 mt-1 h-5 w-5 flex-shrink-0 text-primary"
                    >
                      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                    Promote understanding and appreciation of Alberta's diverse cultural traditions
                  </li>
                  <li className="flex items-start">
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
                      className="mr-2 mt-1 h-5 w-5 flex-shrink-0 text-primary"
                    >
                      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                    Support cultural practitioners and organizations across the province
                  </li>
                  <li className="flex items-start">
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
                      className="mr-2 mt-1 h-5 w-5 flex-shrink-0 text-primary"
                    >
                      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                    Foster connections between different cultural communities
                  </li>
                </ul>
              </div>
              <div className="space-y-4">
                <img
                  src="/placeholder.svg?height=400&width=600"
                  alt="Culture Alberta team"
                  className="aspect-video w-full overflow-hidden rounded-xl object-cover"
                  width={600}
                  height={400}
                />
                <div className="grid grid-cols-2 gap-4">
                  <img
                    src="/placeholder.svg?height=200&width=300"
                    alt="Cultural event"
                    className="aspect-video w-full overflow-hidden rounded-xl object-cover"
                    width={300}
                    height={200}
                  />
                  <img
                    src="/placeholder.svg?height=200&width=300"
                    alt="Heritage site"
                    className="aspect-video w-full overflow-hidden rounded-xl object-cover"
                    width={300}
                    height={200}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/40">
          <div className="container px-4 md:px-6">
            <div className="mx-auto max-w-3xl space-y-8">
              <div className="space-y-2 text-center">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">Our Story</h2>
              </div>
              <div className="space-y-4 text-lg text-muted-foreground">
                <p>
                  Culture Alberta was founded in 2020 by a group of historians, artists, and cultural advocates who
                  recognized the need for a dedicated platform to document and celebrate Alberta's rich cultural
                  heritage.
                </p>
                <p>
                  What began as a small blog has grown into a comprehensive resource for anyone interested in exploring
                  the diverse cultural traditions that have shaped Alberta's identity. Our team now includes writers,
                  researchers, photographers, and community organizers from across the province.
                </p>
                <p>
                  We believe that culture is not static but constantly evolving. While we honor traditional practices
                  and historical perspectives, we also celebrate contemporary expressions and the ways in which
                  Alberta's cultural landscape continues to be enriched by new influences and ideas.
                </p>
                <p>
                  Through our website, events, and community partnerships, we strive to create opportunities for
                  Albertans to connect with their cultural heritage and with each other, fostering a deeper
                  understanding of our shared history and collective future.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="mx-auto max-w-3xl space-y-8">
              <div className="space-y-2 text-center">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">Our Team</h2>
                <p className="text-muted-foreground md:text-xl">
                  Meet the passionate individuals behind Culture Alberta.
                </p>
              </div>
              <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
                {teamMembers.map((member) => (
                  <div key={member.name} className="flex flex-col items-center space-y-2 text-center">
                    <img
                      src={member.image || "/placeholder.svg"}
                      alt={member.name}
                      className="h-32 w-32 rounded-full object-cover"
                      width={128}
                      height={128}
                    />
                    <div>
                      <h3 className="text-xl font-bold">{member.name}</h3>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
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
                      <a href="mailto:info@culturealberta.ca" className="text-primary hover:underline">
                        info@culturealberta.ca
                      </a>
                    </p>
                    <p className="text-muted-foreground">
                      Call us at{" "}
                      <a href="tel:+14035551234" className="text-primary hover:underline">
                        (403) 555-1234
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
                      <Button variant="outline" size="icon">
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
                        <span className="sr-only">Facebook</span>
                      </Button>
                      <Button variant="outline" size="icon">
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
                          <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                        </svg>
                        <span className="sr-only">Twitter</span>
                      </Button>
                      <Button variant="outline" size="icon">
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
                        <span className="sr-only">Instagram</span>
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Send Us a Message</h3>
                  </div>
                  <form className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label
                          htmlFor="first-name"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          First name
                        </label>
                        <Input id="first-name" placeholder="Enter your first name" />
                      </div>
                      <div className="space-y-2">
                        <label
                          htmlFor="last-name"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Last name
                        </label>
                        <Input id="last-name" placeholder="Enter your last name" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label
                        htmlFor="email"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Email
                      </label>
                      <Input id="email" placeholder="Enter your email" type="email" />
                    </div>
                    <div className="space-y-2">
                      <label
                        htmlFor="message"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Message
                      </label>
                      <textarea
                        id="message"
                        className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Enter your message"
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      Send Message
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="w-full border-t bg-background py-6">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            © 2025 Culture Alberta. All rights reserved.
          </p>
          <nav className="flex gap-4 sm:gap-6">
            <Link href="/about" className="text-sm font-medium hover:underline underline-offset-4">
              About
            </Link>
            <Link href="/contact" className="text-sm font-medium hover:underline underline-offset-4">
              Contact
            </Link>
            <Link href="/privacy" className="text-sm font-medium hover:underline underline-offset-4">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm font-medium hover:underline underline-offset-4">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}

// Sample data for team members
const teamMembers = [
  {
    name: "Sarah Johnson",
    role: "Founder & Executive Director",
    image: "/placeholder.svg?height=128&width=128",
  },
  {
    name: "Michael Chen",
    role: "Content Director",
    image: "/placeholder.svg?height=128&width=128",
  },
  {
    name: "Amina Patel",
    role: "Community Outreach Manager",
    image: "/placeholder.svg?height=128&width=128",
  },
  {
    name: "Robert Cardinal",
    role: "Indigenous Heritage Advisor",
    image: "/placeholder.svg?height=128&width=128",
  },
  {
    name: "Elena Kowalski",
    role: "Events Coordinator",
    image: "/placeholder.svg?height=128&width=128",
  },
  {
    name: "David Nguyen",
    role: "Digital Media Specialist",
    image: "/placeholder.svg?height=128&width=128",
  },
]
