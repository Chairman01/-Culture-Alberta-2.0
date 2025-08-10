import './globals.css'
import { MainNavigation } from '@/components/main-navigation'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        <MainNavigation />
        <main>{children}</main>
      </body>
    </html>
  )
}
