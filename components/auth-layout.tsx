'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle: string
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel - Alberta collage (smaller to show full image) */}
      <div className="hidden lg:flex lg:w-[32%] relative bg-gray-100 overflow-hidden min-h-screen items-center justify-center">
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <Image
            src="/images/alberta-collage.png"
            alt="Culture Alberta - Alberta's culture, events, and experiences"
            width={400}
            height={520}
            className="object-contain opacity-95 drop-shadow-2xl"
            priority
            sizes="(max-width: 1024px) 0vw, 32vw"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />
        <div className="absolute inset-0 flex flex-col justify-between p-8 pointer-events-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-colors w-fit drop-shadow-lg">
            <ArrowLeft className="w-4 h-4" />
            Back to Culture Alberta
          </Link>
          <div className="flex items-center gap-3 drop-shadow-lg">
            <Image
              src="/images/ca-logo.png"
              alt="Culture Alberta"
              width={44}
              height={44}
              className="rounded-lg shadow-lg shrink-0"
            />
            <div>
              <p className="text-white font-semibold">Culture Alberta</p>
              <p className="text-white/90 text-xs max-w-[140px] mt-0.5">
                Your guide to Alberta&apos;s culture & events.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 lg:py-0 bg-gradient-to-b from-blue-50/50 to-white">
        <div className="w-full max-w-md">
          {/* Mobile: show back link and branding */}
          <div className="lg:hidden mb-8">
            <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
              <ArrowLeft className="w-4 h-4" />
              Back to Culture Alberta
            </Link>
            <div className="flex items-center gap-3 mb-6">
              <Image
                src="/images/ca-logo.png"
                alt="Culture Alberta"
                width={40}
                height={40}
                className="rounded-lg shrink-0"
              />
              <div>
                <span className="font-bold text-xl text-gray-900 tracking-tight">Culture Alberta</span>
                <p className="text-sm text-gray-500">Alberta&apos;s culture & events</p>
              </div>
            </div>
          </div>

          {/* Auth card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8 lg:p-10">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">{title}</h1>
            <p className="text-gray-600 mb-8">{subtitle}</p>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
