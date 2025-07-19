import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { MainNavigation } from '@/components/main-navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Culture Alberta',
  description: 'Discover the best of Alberta\'s culture, events, and lifestyle',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="relative flex min-h-screen flex-col">
          <MainNavigation />
          {children}
        </div>
      </body>
    </html>
  )
}
