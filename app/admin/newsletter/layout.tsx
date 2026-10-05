// Sends from this page (the alert / everyone card especially) mail ~1,400
// people in ~15 Resend batches. Server Actions inherit the route's duration
// limit, so give them room rather than risk a send cut off half-way.
export const maxDuration = 300

export default function NewsletterLayout({ children }: { children: React.ReactNode }) {
  return children
}
