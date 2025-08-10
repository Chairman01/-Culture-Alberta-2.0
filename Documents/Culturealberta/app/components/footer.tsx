import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function Footer() {
  return (
    <footer className="w-full border-t bg-background py-6">
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="text-lg font-bold mb-4">Culture Alberta</h3>
            <p className="text-sm text-muted-foreground">
              Celebrating and preserving Alberta's rich cultural heritage through stories, events, and community.
            </p>
            <div className="mt-4 flex gap-4">
              <Link
                href="https://www.instagram.com/culturealberta._/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-black hover:text-gray-700"
              >
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
              </Link>
              <Link
                href="https://www.youtube.com/@CultureAlberta_"
                target="_blank"
                rel="noopener noreferrer"
                className="text-black hover:text-gray-700"
              >
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
              </Link>
              <Link href="#" className="text-black hover:text-gray-700">
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
              </Link>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4">Explore</h3>
            <nav className="flex flex-col space-y-2">
              <Link href="/edmonton" className="text-sm text-muted-foreground hover:text-primary">Edmonton</Link>
              <Link href="/calgary" className="text-sm text-muted-foreground hover:text-primary">Calgary</Link>
              <Link href="/food-drink" className="text-sm text-muted-foreground hover:text-primary">Food & Drink</Link>
              <Link href="/events" className="text-sm text-muted-foreground hover:text-primary">Events</Link>
              <Link href="/arts" className="text-sm text-muted-foreground hover:text-primary">Arts</Link>
              <Link href="/best-of" className="text-sm text-muted-foreground hover:text-primary">Best of Alberta</Link>
            </nav>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4">About</h3>
            <nav className="flex flex-col space-y-2">
              <Link href="/about" className="text-sm text-muted-foreground hover:text-primary">About Us</Link>
              <Link href="/contact" className="text-sm text-muted-foreground hover:text-primary">Contact</Link>
              <Link href="/partner" className="text-sm text-muted-foreground hover:text-primary">Partner with Us</Link>
              <Link href="/careers" className="text-sm text-muted-foreground hover:text-primary">Careers</Link>
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary">Privacy Policy</Link>
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary">Terms of Service</Link>
            </nav>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4">Newsletter</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Subscribe to our newsletter for the latest cultural news and events.
            </p>
            <form className="space-y-2">
              <Input placeholder="Enter your email" type="email" />
              <Button className="w-full bg-black hover:bg-gray-800">Subscribe</Button>
            </form>
          </div>
        </div>
        <div className="mt-8 border-t pt-6">
          <p className="text-center text-sm text-muted-foreground">© 2025 Culture Alberta. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
} 