import AlertSender from './alert-sender'

// A full-list send is ~15 Resend batches. Server Actions inherit this page's
// duration limit, so give it room rather than risk a send cut off half-way.
export const maxDuration = 300

export const metadata = { title: 'Send an alert email' }

export default function AlertEmailPage() {
  return <AlertSender />
}
