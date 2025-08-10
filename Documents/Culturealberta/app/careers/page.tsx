import Link from "next/link"
import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function CareersPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <section className="w-full py-6 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">Careers</h1>
                <p className="max-w-[900px] text-muted-foreground md:text-xl">
                  Join our team and help shape Alberta's cultural narrative.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/40">
          <div className="container px-4 md:px-6">
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
              <div>
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">Why Work With Us</h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  At Culture Alberta, we're passionate about celebrating and preserving Alberta's rich cultural
                  heritage. We're looking for talented individuals who share our enthusiasm and want to make a
                  difference in our community.
                </p>
                <p className="mt-4 text-lg text-muted-foreground">
                  When you join our team, you'll be part of a dynamic organization that values:
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
                    Creativity and innovation
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
                    Diversity and inclusion
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
                    Collaboration and teamwork
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
                    Professional growth and development
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
                    Work-life balance and flexible scheduling
                  </li>
                </ul>
              </div>
              <div className="space-y-4">
                <img
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3"
                  alt="Culture Alberta team"
                  className="aspect-video w-full overflow-hidden rounded-xl object-cover"
                  width={600}
                  height={400}
                />
                <div className="grid grid-cols-2 gap-4">
                  <img
                    src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3"
                    alt="Team meeting"
                    className="aspect-video w-full overflow-hidden rounded-xl object-cover"
                    width={300}
                    height={200}
                  />
                  <img
                    src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3"
                    alt="Office space"
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
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">Current Openings</h2>
                <p className="text-muted-foreground md:text-xl">
                  Explore our available positions and find your perfect fit
                </p>
              </div>
              <div className="space-y-6">
                {currentOpenings.map((job) => (
                  <Card key={job.id} className="overflow-hidden">
                    <CardHeader className="bg-muted/50 pb-4">
                      <CardTitle>{job.title}</CardTitle>
                      <CardDescription className="flex flex-wrap gap-2 pt-2">
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                          {job.location}
                        </span>
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                          {job.type}
                        </span>
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                          {job.department}
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <p className="mb-4 text-muted-foreground">{job.description}</p>
                      <h4 className="font-semibold mb-2">Key Responsibilities:</h4>
                      <ul className="list-disc pl-5 space-y-1 mb-4 text-muted-foreground">
                        {job.responsibilities.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                      <h4 className="font-semibold mb-2">Requirements:</h4>
                      <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                        {job.requirements.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter className="border-t bg-muted/20 px-6 py-4">
                      <Button className="bg-black hover:bg-gray-800">Apply Now</Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="mx-auto max-w-3xl space-y-8">
              <div className="space-y-2 text-center">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">Our Hiring Process</h2>
                <p className="text-muted-foreground md:text-xl">What to expect when you apply to join our team</p>
              </div>
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white mb-4">
                    <span className="text-lg font-bold">1</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Application Review</h3>
                  <p className="text-muted-foreground">
                    Our team reviews your application and resume to assess your qualifications.
                  </p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white mb-4">
                    <span className="text-lg font-bold">2</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Initial Interview</h3>
                  <p className="text-muted-foreground">
                    A phone or video call to discuss your experience and learn more about you.
                  </p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white mb-4">
                    <span className="text-lg font-bold">3</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Skills Assessment</h3>
                  <p className="text-muted-foreground">
                    Depending on the role, you may complete a skills test or assignment.
                  </p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white mb-4">
                    <span className="text-lg font-bold">4</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Final Interview</h3>
                  <p className="text-muted-foreground">
                    Meet with the team to discuss the role in detail and ensure it's a good fit.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/40">
          <div className="container px-4 md:px-6">
            <div className="mx-auto max-w-3xl space-y-8">
              <div className="space-y-2 text-center">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">Don't See the Right Fit?</h2>
                <p className="text-muted-foreground md:text-xl">
                  We're always looking for talented individuals to join our team. Send us your resume for future
                  opportunities.
                </p>
              </div>
              <div className="rounded-lg border bg-card p-6">
                <h3 className="text-xl font-bold mb-4">Submit Your Resume</h3>
                <form className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="first-name" className="text-sm font-medium">
                        First name
                      </label>
                      <Input id="first-name" placeholder="Enter your first name" />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="last-name" className="text-sm font-medium">
                        Last name
                      </label>
                      <Input id="last-name" placeholder="Enter your last name" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      Email
                    </label>
                    <Input id="email" type="email" placeholder="Enter your email" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-medium">
                      Phone
                    </label>
                    <Input id="phone" type="tel" placeholder="Enter your phone number" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="resume" className="text-sm font-medium">
                      Resume
                    </label>
                    <Input id="resume" type="file" className="cursor-pointer" />
                    <p className="text-xs text-muted-foreground">Upload your resume (PDF format preferred)</p>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="cover-letter" className="text-sm font-medium">
                      Cover Letter (Optional)
                    </label>
                    <textarea
                      id="cover-letter"
                      className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Tell us why you're interested in joining our team"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-black hover:bg-gray-800">
                    Submit Application
                  </Button>
                </form>
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
            <Link href="/partner" className="text-sm font-medium hover:underline underline-offset-4">
              Partner with Us
            </Link>
            <Link href="/careers" className="text-sm font-medium hover:underline underline-offset-4">
              Careers
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}

// Sample data for current job openings
const currentOpenings = [
  {
    id: 1,
    title: "Content Writer",
    location: "Edmonton, AB",
    type: "Full-time",
    department: "Editorial",
    description:
      "We're looking for a talented Content Writer to join our editorial team. In this role, you'll create engaging content about Alberta's cultural scene, including articles, interviews, and features.",
    responsibilities: [
      "Research and write compelling articles about Alberta's cultural events, arts, food, and heritage",
      "Conduct interviews with local artists, chefs, and cultural figures",
      "Collaborate with photographers and designers to create visually appealing content",
      "Maintain editorial calendar and meet deadlines",
      "Optimize content for SEO and social media sharing",
    ],
    requirements: [
      "Bachelor's degree in Journalism, English, Communications, or related field",
      "2+ years of experience in content writing or journalism",
      "Strong portfolio of published work",
      "Excellent research and interviewing skills",
      "Knowledge of Alberta's cultural landscape is a plus",
    ],
  },
  {
    id: 2,
    title: "Social Media Manager",
    location: "Calgary, AB",
    type: "Full-time",
    department: "Marketing",
    description:
      "We're seeking a creative and data-driven Social Media Manager to grow our online presence and engage with our community across multiple platforms.",
    responsibilities: [
      "Develop and implement social media strategy across Instagram, Facebook, Twitter, and YouTube",
      "Create and schedule engaging content that aligns with our brand voice",
      "Monitor analytics and provide regular performance reports",
      "Respond to comments and messages, building community engagement",
      "Collaborate with editorial and design teams on content creation",
    ],
    requirements: [
      "3+ years of experience in social media management",
      "Proven track record of growing social media accounts",
      "Experience with social media management tools and analytics platforms",
      "Strong copywriting and visual storytelling skills",
      "Knowledge of current social media trends and best practices",
    ],
  },
  {
    id: 3,
    title: "Digital Marketing Coordinator",
    location: "Remote (Alberta-based)",
    type: "Part-time",
    department: "Marketing",
    description:
      "Join our marketing team as a Digital Marketing Coordinator to help promote our content and engage with our audience through various digital channels.",
    responsibilities: [
      "Assist with implementing digital marketing campaigns",
      "Manage email newsletter creation and distribution",
      "Support SEO efforts and website analytics tracking",
      "Help coordinate partnerships with local businesses and organizations",
      "Assist with content promotion across digital channels",
    ],
    requirements: [
      "1-2 years of experience in digital marketing",
      "Familiarity with email marketing platforms and Google Analytics",
      "Basic understanding of SEO principles",
      "Strong organizational and communication skills",
      "Experience with content management systems",
    ],
  },
]
