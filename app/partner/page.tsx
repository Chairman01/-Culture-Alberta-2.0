import Link from "next/link"
import { Search, Download, Mail, Phone, LocateIcon as Location } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function PartnerPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <section className="w-full py-6 bg-muted/30">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">Partner with Us</h1>
                <p className="max-w-[900px] text-muted-foreground md:text-xl mx-auto">
                  Join us in celebrating and promoting Alberta's vibrant culture.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/30">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Focus Areas</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl mx-auto">
                  Our diversified and extensive pillars of editorial coverage will ensure that your brand and promotion
                  always sit within the matching context, right at the moment when our audience is consuming the
                  content.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 md:grid-cols-4 lg:gap-12 mt-8">
              {focusAreas.map((area, index) => (
                <div key={index} className="flex flex-col items-center space-y-2 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black text-white">
                    <span className="text-xl font-bold">{index + 1}</span>
                  </div>
                  <h3 className="text-xl font-bold">{area}</h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Culture Media Ecosystem</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl mx-auto">
                  At Culture Media, we pride ourselves in offering a wide range of opportunities for advertisers to tap
                  into the power of our platforms.
                </p>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 max-w-7xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Brand Amplification</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    By partnering with us, advertisers can amplify their message within the realm of culture media,
                    increase brand visibility, and effectively communicate key messages directly to our engaged
                    audience.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Strategic Narrative</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    In our marketing strategy, we focus on crafting a captivating narrative that deeply connects with
                    our target audience, while conversion entails transforming that narrative into tangible actions or
                    loyal followers.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/30">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Our Insights</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl mx-auto">
                  Every organization needs a digital footprint. Culture Media has you covered.
                </p>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-3 max-w-7xl mx-auto">
              <Card className="text-center">
                <CardHeader>
                  <CardTitle className="text-4xl font-bold">380,000+</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl">Total Followers</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardHeader>
                  <CardTitle className="text-4xl font-bold">24,500+</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl">Total Accounts Reached</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardHeader>
                  <CardTitle className="text-4xl font-bold">700,000+</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl">Total Impressions</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Demographics</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl mx-auto">
                  Understanding our audience helps you target your message effectively
                </p>
              </div>
            </div>
            <div className="grid gap-12 md:grid-cols-2 max-w-7xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Culture YYC Demographics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h4 className="mb-2 text-lg font-medium">Gender</h4>
                      <div className="flex items-center gap-4">
                        <div className="w-full">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">Female</span>
                            <span className="text-sm font-medium">60%</span>
                          </div>
                          <div className="h-2 w-full bg-muted overflow-hidden rounded-full">
                            <div className="h-full bg-black" style={{ width: "60%" }}></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="w-full">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">Male</span>
                            <span className="text-sm font-medium">40%</span>
                          </div>
                          <div className="h-2 w-full bg-muted overflow-hidden rounded-full">
                            <div className="h-full bg-black" style={{ width: "40%" }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="mb-2 text-lg font-medium">Age</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { age: "13-17", percentage: "5%" },
                          { age: "18-24", percentage: "20%" },
                          { age: "25-34", percentage: "40%" },
                          { age: "35-44", percentage: "20%" },
                          { age: "45-54", percentage: "10%" },
                          { age: "55-64", percentage: "3%" },
                          { age: "65+", percentage: "2%" },
                        ].map((item, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-sm">{item.age}</span>
                            <span className="text-sm font-medium">{item.percentage}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="mb-2 text-lg font-medium">Location</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Calgary</span>
                          <span className="text-sm font-medium">85%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Airdrie</span>
                          <span className="text-sm font-medium">15%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Culture Alberta Demographics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h4 className="mb-2 text-lg font-medium">Gender</h4>
                      <div className="flex items-center gap-4">
                        <div className="w-full">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">Female</span>
                            <span className="text-sm font-medium">60%</span>
                          </div>
                          <div className="h-2 w-full bg-muted overflow-hidden rounded-full">
                            <div className="h-full bg-black" style={{ width: "60%" }}></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="w-full">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">Male</span>
                            <span className="text-sm font-medium">40%</span>
                          </div>
                          <div className="h-2 w-full bg-muted overflow-hidden rounded-full">
                            <div className="h-full bg-black" style={{ width: "40%" }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="mb-2 text-lg font-medium">Age</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { age: "13-17", percentage: "3%" },
                          { age: "18-24", percentage: "15%" },
                          { age: "25-34", percentage: "45%" },
                          { age: "35-44", percentage: "25%" },
                          { age: "45-54", percentage: "8%" },
                          { age: "55-64", percentage: "3%" },
                          { age: "65+", percentage: "1%" },
                        ].map((item, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-sm">{item.age}</span>
                            <span className="text-sm font-medium">{item.percentage}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="mb-2 text-lg font-medium">Location</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Edmonton</span>
                          <span className="text-sm font-medium">65.7%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Calgary</span>
                          <span className="text-sm font-medium">30.3%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Saint Albert</span>
                          <span className="text-sm font-medium">4.0%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/30">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Advertising Rates</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl mx-auto">
                  Effective solutions to promote your brand across our platforms
                </p>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Instagram Featured Post</CardTitle>
                  <CardDescription>Average Reach: 10,000 to 30,000</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">$250</div>
                  <p className="mt-2 text-muted-foreground">Per post</p>
                </CardContent>
                <CardFooter>
                  <Button className="w-full bg-black hover:bg-gray-800">Get Started</Button>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Instagram Story</CardTitle>
                  <CardDescription>Average Views: 5,000 to 20,000</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">$125</div>
                  <p className="mt-2 text-muted-foreground">Per story</p>
                </CardContent>
                <CardFooter>
                  <Button className="w-full bg-black hover:bg-gray-800">Get Started</Button>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Instagram Giveaway Bundle</CardTitle>
                  <CardDescription>Includes featured posts and stories</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">$400</div>
                  <p className="mt-2 text-muted-foreground">Average Reach: 35,000 to 55,000</p>
                </CardContent>
                <CardFooter>
                  <Button className="w-full bg-black hover:bg-gray-800">Get Started</Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Campaign Packages</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl mx-auto">
                  Long-term partnerships for sustained brand visibility
                </p>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Package</CardTitle>
                  <CardDescription>2 Feed Posts Per Month</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center">
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
                        className="mr-2 h-4 w-4"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Posts can be giveaways
                    </li>
                    <li className="flex items-center">
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
                        className="mr-2 h-4 w-4"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Carousels/Reels Included
                    </li>
                    <li className="flex items-center">
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
                        className="mr-2 h-4 w-4"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      2 Instagram Story Shares
                    </li>
                  </ul>
                  <div className="pt-4">
                    <div className="mb-2 text-sm font-medium">Total Estimated Reach:</div>
                    <div className="text-sm">30,000 to 60,000</div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <div className="grid w-full grid-cols-3 gap-2">
                    <div className="flex flex-col items-center justify-center rounded-lg border p-4">
                      <span className="text-sm font-medium">3 Month</span>
                      <span className="text-lg font-bold">$250/M</span>
                    </div>
                    <div className="flex flex-col items-center justify-center rounded-lg border p-4">
                      <span className="text-sm font-medium">6 Month</span>
                      <span className="text-lg font-bold">$225/M</span>
                    </div>
                    <div className="flex flex-col items-center justify-center rounded-lg border p-4">
                      <span className="text-sm font-medium">12 Month</span>
                      <span className="text-lg font-bold">$200/M</span>
                    </div>
                  </div>
                  <Button className="w-full bg-black hover:bg-gray-800">Get Started</Button>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Standard Package</CardTitle>
                  <CardDescription>3 Feed Posts Per Month</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center">
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
                        className="mr-2 h-4 w-4"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Posts can be giveaways
                    </li>
                    <li className="flex items-center">
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
                        className="mr-2 h-4 w-4"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Carousels/Reels Included
                    </li>
                    <li className="flex items-center">
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
                        className="mr-2 h-4 w-4"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      3 Instagram Story Shares
                    </li>
                  </ul>
                  <div className="pt-4">
                    <div className="mb-2 text-sm font-medium">Total Estimated Reach:</div>
                    <div className="text-sm">50,000 to 120,000</div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <div className="grid w-full grid-cols-3 gap-2">
                    <div className="flex flex-col items-center justify-center rounded-lg border p-4">
                      <span className="text-sm font-medium">3 Month</span>
                      <span className="text-lg font-bold">$350/M</span>
                    </div>
                    <div className="flex flex-col items-center justify-center rounded-lg border p-4">
                      <span className="text-sm font-medium">6 Month</span>
                      <span className="text-lg font-bold">$325/M</span>
                    </div>
                    <div className="flex flex-col items-center justify-center rounded-lg border p-4">
                      <span className="text-sm font-medium">12 Month</span>
                      <span className="text-lg font-bold">$300/M</span>
                    </div>
                  </div>
                  <Button className="w-full bg-black hover:bg-gray-800">Get Started</Button>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Premium Package</CardTitle>
                  <CardDescription>4 Feed Posts Per Month</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center">
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
                        className="mr-2 h-4 w-4"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Posts can be giveaways
                    </li>
                    <li className="flex items-center">
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
                        className="mr-2 h-4 w-4"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Carousels/Reels Included
                    </li>
                    <li className="flex items-center">
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
                        className="mr-2 h-4 w-4"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      4 Instagram Story Shares
                    </li>
                  </ul>
                  <div className="pt-4">
                    <div className="mb-2 text-sm font-medium">Total Estimated Reach:</div>
                    <div className="text-sm">70,000 to 160,000</div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <div className="grid w-full grid-cols-3 gap-2">
                    <div className="flex flex-col items-center justify-center rounded-lg border p-4">
                      <span className="text-sm font-medium">3 Month</span>
                      <span className="text-lg font-bold">$450/M</span>
                    </div>
                    <div className="flex flex-col items-center justify-center rounded-lg border p-4">
                      <span className="text-sm font-medium">6 Month</span>
                      <span className="text-lg font-bold">$425/M</span>
                    </div>
                    <div className="flex flex-col items-center justify-center rounded-lg border p-4">
                      <span className="text-sm font-medium">12 Month</span>
                      <span className="text-lg font-bold">$400/M</span>
                    </div>
                  </div>
                  <Button className="w-full bg-black hover:bg-gray-800">Get Started</Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/30">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">The Campaign Process</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl mx-auto">
                  How we work with you to create successful campaigns
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col items-center space-y-2 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black text-white">
                  <span className="text-xl font-bold">1</span>
                </div>
                <h3 className="text-xl font-bold">Gather Strategic Insights</h3>
                <p className="text-sm text-muted-foreground">
                  We collaborate together to understand your business objectives and provide tailored strategies
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black text-white">
                  <span className="text-xl font-bold">2</span>
                </div>
                <h3 className="text-xl font-bold">Create Captivating Content</h3>
                <p className="text-sm text-muted-foreground">
                  Drawing upon our audience insights, we possess the expertise to shape your message into captivating
                  and powerful storytelling
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black text-white">
                  <span className="text-xl font-bold">3</span>
                </div>
                <h3 className="text-xl font-bold">Release It To The World</h3>
                <p className="text-sm text-muted-foreground">
                  Maximize your campaign's reach through our owned media portfolio, including websites, social
                  platforms, and more
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black text-white">
                  <span className="text-xl font-bold">4</span>
                </div>
                <h3 className="text-xl font-bold">Campaign Debrief</h3>
                <p className="text-sm text-muted-foreground">
                  We analyze results and provide detailed reporting on campaign performance and audience engagement
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Additional Services</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl mx-auto">
                  Beyond advertising, we offer comprehensive digital solutions
                </p>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Social Media Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">
                    At Culture Media, we recognize the challenges of running a business and the limited time available
                    for managing social media channels.
                  </p>
                  <p className="mb-4">
                    Our customized management services are dedicated to elevating your brand's online presence.
                  </p>
                  <div className="mt-4">
                    <h4 className="text-lg font-medium mb-2">Our services include:</h4>
                    <ul className="space-y-1">
                      <li className="flex items-center">
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
                          className="mr-2 h-4 w-4"
                        >
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Reputation Management
                      </li>
                      <li className="flex items-center">
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
                          className="mr-2 h-4 w-4"
                        >
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Strategy Development
                      </li>
                      <li className="flex items-center">
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
                          className="mr-2 h-4 w-4"
                        >
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Content Creation and Curation
                      </li>
                      <li className="flex items-center">
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
                          className="mr-2 h-4 w-4"
                        >
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Posting and Scheduling
                      </li>
                      <li className="flex items-center">
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
                          className="mr-2 h-4 w-4"
                        >
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Community Management
                      </li>
                      <li className="flex items-center">
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
                          className="mr-2 h-4 w-4"
                        >
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Performance Tracking and Analysis
                      </li>
                      <li className="flex items-center">
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
                          className="mr-2 h-4 w-4"
                        >
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Advertising and Campaign Management
                      </li>
                    </ul>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full bg-black hover:bg-gray-800">Learn More</Button>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Digital Media Strategy</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">
                    Whether you're just starting out or have been in business for years, developing a solid digital
                    media strategy is vital for your success.
                  </p>
                  <p className="mb-4">
                    At Culture Media, we specialize in building effective and customized digital media strategies
                    tailored to your unique goals and objectives.
                  </p>
                  <p className="mb-4">
                    Our team of experts will work closely with you to understand your target audience, identify the most
                    appropriate digital platforms, and create compelling content that resonates with your audience.
                  </p>
                  <p>
                    We will also help you establish policies and guidelines to regulate your company's use of digital
                    media, ensuring a consistent and cohesive brand presence.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button className="w-full bg-black hover:bg-gray-800">Learn More</Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/30">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Our Clients</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl mx-auto">
                  We've partnered with many businesses based in Alberta and have helped them reach a large audience
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((index) => (
                <div key={index} className="flex items-center justify-center p-4">
                  <div className="h-16 w-32 bg-muted rounded-md flex items-center justify-center">
                    <span className="text-muted-foreground">Client Logo</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">Let's work together!</h2>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                    Ready to take your brand to the next level? Contact us today to discuss how we can help you reach
                    your target audience.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <a
                    href="/files/culture-alberta-media-kit.pdf"
                    download
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-black text-white hover:bg-gray-800 h-10 px-4 py-2"
                  >
                    <Download className="mr-2 h-4 w-4" /> Download Media Kit
                  </a>
                  <Button variant="outline">Contact Us</Button>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Location className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">1685 Centre Street SW, Calgary, AB, T2G 5P6</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">226 236 1828</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">culturemedia101@gmail.com</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="mb-4 text-lg font-bold">Contact Form</h3>
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
                      <Input id="email" placeholder="Enter your email" type="email" />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="company" className="text-sm font-medium">
                        Company
                      </label>
                      <Input id="company" placeholder="Enter your company name" />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="message" className="text-sm font-medium">
                        Message
                      </label>
                      <textarea
                        id="message"
                        className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Enter your message"
                      />
                    </div>
                    <Button type="submit" className="w-full bg-black hover:bg-gray-800">
                      Send Message
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="w-full border-t bg-background py-6">
        <div className="container mx-auto max-w-7xl px-4 md:px-6">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <h3 className="text-lg font-bold mb-4">Culture Alberta</h3>
              <p className="text-sm text-muted-foreground">
                Celebrating and preserving Alberta's rich cultural heritage through stories, events, and community.
              </p>
              <div className="mt-4 flex gap-4">
                <div className="flex items-center gap-3">
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
                      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">Explore</h3>
              <nav className="flex flex-col space-y-2">
                <Link href="/edmonton" className="text-sm text-muted-foreground hover:text-primary">
                  Edmonton
                </Link>
                <Link href="/calgary" className="text-sm text-muted-foreground hover:text-primary">
                  Calgary
                </Link>
                <Link href="/food-drink" className="text-sm text-muted-foreground hover:text-primary">
                  Food & Drink
                </Link>
                <Link href="/events" className="text-sm text-muted-foreground hover:text-primary">
                  Events
                </Link>
                <Link href="/arts" className="text-sm text-muted-foreground hover:text-primary">
                  Arts
                </Link>
                <Link href="/best-of" className="text-sm text-muted-foreground hover:text-primary">
                  Best of Alberta
                </Link>
              </nav>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">About</h3>
              <nav className="flex flex-col space-y-2">
                <Link href="/about" className="text-sm text-muted-foreground hover:text-primary">
                  About Us
                </Link>
                <Link href="/contact" className="text-sm text-muted-foreground hover:text-primary">
                  Contact
                </Link>
                <Link href="/partner" className="text-sm text-muted-foreground hover:text-primary">
                  Partner with Us
                </Link>
                <Link href="/careers" className="text-sm text-muted-foreground hover:text-primary">
                  Careers
                </Link>
                <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary">
                  Terms of Service
                </Link>
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
    </div>
  )
}

const focusAreas = ["News", "Things to do", "Fashion", "Food & Drinks", "Events", "Money", "Real Estate", "Sports"]
