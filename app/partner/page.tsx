"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, X, MapPin, Phone, Mail, Download, Users, Eye, TrendingUp, Zap, Target, BarChart3, Sparkles, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Client logos with their websites
const clients = [
  { name: "Moveology", logo: "/images/clients/moveology.png", url: "https://moveology.ca" },
  { name: "Tutti Frutti", logo: "/images/clients/tutti-frutti.png", url: "https://tuttifrutti.com" },
  { name: "Neon YYC", logo: "/images/clients/neon-yyc.png", url: "#" },
  { name: "Pho City YYC", logo: "/images/clients/pho-city-yyc.png", url: "#" },
  { name: "TC Legal", logo: "/images/clients/tc-legal.png", url: "#" },
  { name: "Sport Calgary", logo: "/images/clients/sport-calgary.png", url: "https://sportcalgary.ca" },
  { name: "Gamecon Canada", logo: "/images/clients/gamecon-canada.png", url: "#" },
  { name: "Pekko Chicken", logo: "/images/clients/pekko-chicken.png", url: "#" },
  { name: "Tire Doctors", logo: "/images/clients/tiredoctors.png", url: "#" },
]

// Animated counter component
function AnimatedCounter({ end, suffix = "", duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0)
  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    if (hasAnimated) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setHasAnimated(true)
          let startTime: number
          const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime
            const progress = Math.min((currentTime - startTime) / duration, 1)
            setCount(Math.floor(progress * end))
            if (progress < 1) {
              requestAnimationFrame(animate)
            }
          }
          requestAnimationFrame(animate)
        }
      },
      { threshold: 0.5 }
    )

    const element = document.getElementById(`counter-${end}`)
    if (element) observer.observe(element)

    return () => observer.disconnect()
  }, [end, duration, hasAnimated])

  return (
    <span id={`counter-${end}`}>
      {count.toLocaleString()}{suffix}
    </span>
  )
}

export default function PartnerPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        {/* Hero Section - Clean & Modern */}
        <section className="w-full py-16 md:py-24 lg:py-32 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
          {/* Subtle decorative elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="container relative z-10 mx-auto max-w-6xl px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-8 text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black text-white text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                Alberta's Leading Local Media
              </div>

              {/* Main headline */}
              <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 leading-tight">
                We Reach <AnimatedCounter end={1000000} suffix="+" />
                <br />
                <span className="text-blue-600 font-black">Albertans</span>
              </h1>

              <p className="max-w-2xl text-lg md:text-xl text-gray-600 leading-relaxed font-body">
                From the hottest new restaurants to viral local moments, we're the ultimate guide to
                Calgary and Edmonton's trending culture, events, and lifestyle.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <Button
                  size="lg"
                  className="bg-black text-white hover:bg-gray-800 font-semibold text-lg px-8 py-6 gap-2 rounded-full"
                  onClick={() => setIsModalOpen(true)}
                >
                  Get Your Brand Featured
                  <ArrowRight className="h-5 w-5" />
                </Button>
                <Link href="https://culturemedia.ca" target="_blank" rel="noopener noreferrer">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold text-lg px-8 py-6 rounded-full"
                  >
                    View Media Kit
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Cities Section - Hyper-Local Coverage */}
        <section className="w-full py-16 bg-white">
          <div className="container mx-auto max-w-6xl px-4 md:px-6">
            <div className="text-center mb-10">
              <h2 className="font-display text-4xl md:text-5xl font-black text-gray-900 mb-4">
                Hyper-Local Coverage
              </h2>
              <p className="text-lg text-gray-600 font-body">We know Alberta inside and out</p>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              {[
                { name: "CALGARY", color: "bg-red-600 text-white" },
                { name: "EDMONTON", color: "bg-blue-600 text-white" },
                { name: "RED DEER", color: "bg-gray-100 text-gray-700 border border-gray-200" },
                { name: "LETHBRIDGE", color: "bg-gray-100 text-gray-700 border border-gray-200" },
                { name: "& MORE", color: "bg-gray-100 text-gray-700 border border-gray-200" },
              ].map((city) => (
                <div
                  key={city.name}
                  className={`px-6 py-3 rounded-full font-bold text-lg transition-all duration-300 hover:scale-105 ${city.color}`}
                >
                  {city.name}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trusted Clients Section */}
        <section className="w-full py-20 bg-gray-50">
          <div className="container mx-auto max-w-6xl px-4 md:px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Left side - Text */}
              <div className="space-y-6">
                <h2 className="font-display text-4xl md:text-5xl font-black text-gray-900 leading-tight">
                  Trusted by
                  <span className="text-blue-600"> local businesses </span>
                  across Alberta
                </h2>
                <p className="text-lg text-gray-600 font-body">
                  From restaurants to retailers, we help Alberta businesses connect with their community
                  through authentic storytelling and strategic content placement.
                </p>
                <div className="space-y-3">
                  {[
                    "Authentic content that resonates locally",
                    "Instagram, YouTube, Newsletter & Web",
                    "Real engagement from real Albertans"
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700 font-body">{item}</span>
                    </div>
                  ))}
                </div>
                <Button
                  className="bg-black text-white hover:bg-gray-800 font-semibold px-8 py-6 rounded-full gap-2"
                  onClick={() => setIsModalOpen(true)}
                >
                  Partner With Us!
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>

              {/* Right side - Logo Grid */}
              <div className="grid grid-cols-3 gap-4">
                {clients.map((client, index) => (
                  <Link
                    key={index}
                    href={client.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center h-28 p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md hover:scale-105 transition-all duration-300"
                    title={client.name}
                  >
                    <Image
                      src={client.logo}
                      alt={client.name}
                      width={140}
                      height={70}
                      className="object-contain max-h-20"
                    />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section - Clean Cards */}
        <section className="w-full py-16 bg-white">
          <div className="container mx-auto max-w-6xl px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: Users, value: 50000, suffix: "+", label: "Total Followers", color: "blue" },
                { icon: Eye, value: 1000000, suffix: "+", label: "Monthly Impressions", color: "green" },
                { icon: TrendingUp, value: 250000, suffix: "+", label: "Accounts Reached Weekly", color: "purple" },
              ].map((stat, index) => (
                <div
                  key={index}
                  className="group p-8 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-300"
                >
                  <div className={`inline-flex p-3 rounded-xl mb-4 ${stat.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                    stat.color === 'green' ? 'bg-green-100 text-green-600' :
                      'bg-purple-100 text-purple-600'
                    }`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
                    <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-lg text-gray-500 font-body">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What We Offer */}
        <section className="w-full py-20 bg-gray-50">
          <div className="container mx-auto max-w-6xl px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="font-display text-4xl md:text-5xl font-black text-gray-900 mb-4">
                Why Partner With Us?
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto font-body">
                We create authentic content that resonates with Albertans and drives real results for your brand.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Zap, title: "Viral Content", desc: "Our team crafts share-worthy content that gets your brand noticed" },
                { icon: Target, title: "Targeted Reach", desc: "Connect with Calgary & Edmonton's most engaged audiences" },
                { icon: BarChart3, title: "Proven Results", desc: "Data-driven campaigns that deliver measurable ROI" },
                { icon: Users, title: "Community Trust", desc: "Built on 50K+ followers who trust our recommendations" },
                { icon: Sparkles, title: "Creative Excellence", desc: "In-house team dedicated to making your brand shine" },
                { icon: TrendingUp, title: "Local Expertise", desc: "Deep understanding of Alberta's culture and trends" },
              ].map((item, index) => (
                <div
                  key={index}
                  className="group p-6 rounded-xl bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300"
                >
                  <div className="inline-flex p-3 rounded-xl bg-gray-100 mb-4 group-hover:bg-black group-hover:text-white transition-colors">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600 font-body">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The Campaign Process */}
        <section className="w-full py-20 bg-white">
          <div className="container mx-auto max-w-6xl px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="font-display text-4xl md:text-5xl font-black text-gray-900 mb-4 italic">
                The Campaign Process
              </h2>
              <p className="text-lg text-gray-600 font-body">
                How we work with you to create successful campaigns
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  step: 1,
                  title: "Gather Strategic Insights",
                  desc: "We collaborate together to understand your business objectives and provide tailored strategies"
                },
                {
                  step: 2,
                  title: "Create Captivating Content",
                  desc: "Drawing upon our audience insights, we possess the expertise to shape your message into captivating and powerful storytelling"
                },
                {
                  step: 3,
                  title: "Release It To The World",
                  desc: "Maximize your campaign's reach through our owned media portfolio, including websites, social platforms, and more"
                },
                {
                  step: 4,
                  title: "Campaign Debrief",
                  desc: "We analyze results and provide detailed reporting on campaign performance and audience engagement"
                },
              ].map((item) => (
                <div key={item.step} className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-black text-white flex items-center justify-center text-2xl font-bold mb-6">
                    {item.step}
                  </div>
                  <h3 className="font-display text-xl font-bold text-gray-900 mb-3">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 font-body text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What We Cover */}
        <section className="w-full py-20 bg-gray-50">
          <div className="container mx-auto max-w-6xl px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="font-display text-4xl md:text-5xl font-black text-gray-900 mb-4">
                What We Cover
              </h2>
              <p className="text-lg text-gray-600 font-body">
                Your brand reaches the right audience at the perfect moment
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {[
                { name: "Food & Drinks", emoji: "🍔" },
                { name: "Events", emoji: "🎉" },
                { name: "Entertainment", emoji: "🎬" },
                { name: "Sports", emoji: "⚡" },
                { name: "Arts & Culture", emoji: "🎨" },
                { name: "Real Estate", emoji: "🏠" },
                { name: "Local News", emoji: "📰" },
                { name: "Things To Do", emoji: "🗺️" },
              ].map((area) => (
                <div
                  key={area.name}
                  className="group flex items-center justify-center gap-3 py-5 px-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-black hover:shadow-md transition-all duration-300"
                >
                  <span className="text-2xl group-hover:scale-125 transition-transform">{area.emoji}</span>
                  <span className="font-semibold text-gray-700">{area.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-20 bg-gray-900">
          <div className="container mx-auto max-w-4xl px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-8 text-center">
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white leading-tight">
                Ready to Reach Alberta?
              </h2>
              <p className="max-w-xl text-lg text-gray-300 font-body">
                Fill in the form and a member of our team will reach out to get started on your branded campaign.
              </p>
              <Button
                size="lg"
                className="bg-white text-black hover:bg-gray-100 font-bold text-lg px-10 py-7 gap-3 rounded-full shadow-lg"
                onClick={() => setIsModalOpen(true)}
              >
                Let's Work Together
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Contact Modal - Clean Style */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
            >
              <X className="h-6 w-6 text-gray-500" />
            </button>

            <div className="grid md:grid-cols-2 gap-0">
              {/* Left side - Info */}
              <div className="p-8 md:p-10 bg-gray-50 rounded-l-2xl">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black text-white text-sm font-medium mb-6">
                  <Sparkles className="h-4 w-4" />
                  Partner With Us
                </div>
                <h2 className="font-display text-3xl font-bold text-gray-900 mb-4">Let's create something amazing together!</h2>
                <p className="text-gray-600 mb-8 font-body">
                  Ready to take your brand to the next level? Contact us today to discuss how we can help you reach Alberta's most engaged audience.
                </p>

                <div className="flex gap-3 mb-8">
                  <Link href="https://culturemedia.ca" target="_blank" rel="noopener noreferrer">
                    <Button className="bg-black text-white hover:bg-gray-800 gap-2 rounded-full px-6">
                      <Download className="h-4 w-4" />
                      Media Kit
                    </Button>
                  </Link>
                  <Link href="/contact">
                    <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100 rounded-full px-6">
                      Contact Page
                    </Button>
                  </Link>
                </div>

                <div className="space-y-4 text-gray-600">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-200 rounded-lg">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <span>Calgary, AB</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-200 rounded-lg">
                      <Phone className="h-4 w-4" />
                    </div>
                    <span>226 236 1828</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-200 rounded-lg">
                      <Mail className="h-4 w-4" />
                    </div>
                    <span>culturemedia101@gmail.com</span>
                  </div>
                </div>
              </div>

              {/* Right side - Form */}
              <div className="p-8 md:p-10">
                <h3 className="font-display text-xl font-bold text-gray-900 mb-6">Send us a message</h3>
                <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="firstName" className="text-sm font-medium text-gray-700">First name</label>
                      <Input
                        id="firstName"
                        placeholder="John"
                        className="border-gray-300 focus:border-black focus:ring-black rounded-xl h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="lastName" className="text-sm font-medium text-gray-700">Last name</label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        className="border-gray-300 focus:border-black focus:ring-black rounded-xl h-12"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@company.com"
                      className="border-gray-300 focus:border-black focus:ring-black rounded-xl h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="company" className="text-sm font-medium text-gray-700">Company</label>
                    <Input
                      id="company"
                      placeholder="Your company name"
                      className="border-gray-300 focus:border-black focus:ring-black rounded-xl h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="message" className="text-sm font-medium text-gray-700">Message</label>
                    <textarea
                      id="message"
                      className="min-h-[120px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                      placeholder="Tell us about your brand and what you're looking for..."
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-black text-white hover:bg-gray-800 font-bold h-14 text-lg rounded-xl"
                  >
                    Send Message
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
