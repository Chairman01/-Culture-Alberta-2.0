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
      {/* Left panel - Alberta collage */}
      <div className="hidden lg:flex lg:w-[42%] relative overflow-hidden min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-amber-50/60">
        {/* Soft ambient glows behind the collage */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-200/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-16 w-96 h-96 rounded-full bg-amber-200/30 blur-3xl pointer-events-none" />

        <div className="absolute inset-0 flex items-center justify-center p-10">
          <Image
            src="/images/alberta-collage.png"
            alt="Culture Alberta - Alberta's culture, events, and experiences"
            width={520}
            height={670}
            className="object-contain drop-shadow-2xl"
            priority
            sizes="(max-width: 1024px) 0vw, 42vw"
          />
        </div>

        {/* Back link, top-left */}
        <div className="absolute top-0 inset-x-0 p-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors w-fit font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Culture Alberta
          </Link>
        </div>

        {/* Quote + brand, anchored to the bottom over a soft fade for legibility */}
        <div className="absolute bottom-0 inset-x-0 px-9 pb-9 pt-28 bg-gradient-to-t from-white via-white/85 to-transparent">
          <p className="font-serif italic text-gray-800 text-lg leading-snug max-w-sm">
            “Where we love is home — where our feet may leave, but never our hearts.”
          </p>
          <p className="text-gray-500 text-xs mt-2">— Oliver Wendell Holmes</p>
          <div className="flex items-center gap-3 mt-7">
            <Image
              src="/images/ca-logo.png"
              alt="Culture Alberta"
              width={44}
              height={44}
              className="rounded-lg shadow-md shrink-0"
            />
            <div>
              <p className="text-gray-900 font-semibold">Culture Alberta</p>
              <p className="text-gray-500 text-xs max-w-[160px] mt-0.5">
                Your guide to Alberta&apos;s culture &amp; events.
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
