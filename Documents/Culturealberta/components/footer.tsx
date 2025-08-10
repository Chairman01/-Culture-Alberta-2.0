import Link from "next/link"
import { Facebook, Instagram, Twitter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function Footer() {
  return (
    <footer className="w-full border-t bg-background py-12">
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="text-lg font-bold mb-4">Culture Alberta</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Celebrating and preserving Alberta's rich cultural heritage through stories, events, and community.
            </p>
            <div className="flex gap-4">
              <Link href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-black hover:text-gray-700">
                <Facebook className="h-5 w-5" />
                <span className="sr-only">Facebook</span>
              </Link>
              <Link href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-black hover:text-gray-700">
                <Instagram className="h-5 w-5" />
                <span className="sr-only">Instagram</span>
              </Link>
              <Link href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-black hover:text-gray-700">
                <Twitter className="h-5 w-5" />
                <span className="sr-only">Twitter</span>
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
              <Link href="/advertise" className="text-sm text-muted-foreground hover:text-primary">Advertise</Link>
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
