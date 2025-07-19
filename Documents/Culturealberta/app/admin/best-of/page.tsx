"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Edit, Plus, Search, Trash2, Star } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

export default function BestOfAdminPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [locationFilter, setLocationFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null)
  const [bestOfItems, setBestOfItems] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  const itemsPerPage = 10

  // Load best of items data on component mount
  useEffect(() => {
    // Start with the default items
    const itemsData = [...mockBestOfItems]

    // Try to load any items from localStorage
    try {
      // Get all localStorage keys
      const keys = Object.keys(localStorage)

      // Find keys that match our bestof pattern
      const bestofKeys = keys.filter((key) => key.startsWith("bestof_") && !key.startsWith("bestof_image_"))

      for (const key of bestofKeys) {
        const itemId = key.replace("bestof_", "")
        const savedItemJson = localStorage.getItem(key)

        if (savedItemJson) {
          const savedItem = JSON.parse(savedItemJson)

          // Check if this item already exists in our array
          const existingIndex = itemsData.findIndex((item) => item.id === itemId)
          if (existingIndex !== -1) {
            // Update existing item
            itemsData[existingIndex] = savedItem
          } else {
            // Add new item
            itemsData.push(savedItem)
          }
        }
      }
    } catch (error) {
      console.error("Error loading saved best of items data:", error)
    }

    setBestOfItems(itemsData)
    setIsLoading(false)
  }, [])

  // Filter items based on search term, category, and location
  const filteredItems = bestOfItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "all" || item.category.toLowerCase() === categoryFilter.toLowerCase()
    const matchesLocation =
      locationFilter === "all" || item.location.toLowerCase().includes(locationFilter.toLowerCase())

    return matchesSearch && matchesCategory && matchesLocation
  })

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)

  // Get unique categories for filter dropdown
  const categories = Array.from(new Set(bestOfItems.map((item) => item.category)))

  // Get unique locations for filter dropdown
  const locations = Array.from(
    new Set(
      bestOfItems.map((item) => {
        const city = item.location.split(",")[0].trim()
        return city
      }),
    ),
  )

  const handleDeleteItem = (id: string) => {
    try {
      // Remove from localStorage if it exists
      localStorage.removeItem(`bestof_${id}`)
      localStorage.removeItem(`bestof_image_${id}`)

      // Remove from state
      setBestOfItems(bestOfItems.filter((item) => item.id !== id))

      toast({
        title: "Item deleted",
        description: "The listing has been successfully deleted.",
      })
    } catch (error) {
      console.error("Error deleting item:", error)
      toast({
        title: "Error deleting item",
        description: "There was a problem deleting the listing.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6 md:gap-10">
            <Link href="/admin/dashboard" className="flex items-center space-x-2">
              <span className="text-xl font-bold">Culture Alberta</span>
            </Link>
            <span className="text-lg font-semibold">Best of Alberta Management</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/admin/dashboard">Dashboard</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/new-bestof">
                <Plus className="mr-2 h-4 w-4" /> Create New Listing
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 container py-10">
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Best of Alberta Listings ({filteredItems.length})</h2>
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search listings..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category.toLowerCase()}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location} value={location.toLowerCase()}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.length > 0 ? (
                  currentItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.location}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                          <span>{item.rating}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/admin/edit-bestof/${item.id}`}>
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Link>
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => setDeleteItemId(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Confirm Deletion</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to delete "{item.name}"? This action cannot be undone.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter className="mt-4">
                                <DialogClose asChild>
                                  <Button variant="outline">Cancel</Button>
                                </DialogClose>
                                <Button
                                  variant="destructive"
                                  onClick={() => {
                                    if (deleteItemId) {
                                      handleDeleteItem(deleteItemId)
                                    }
                                  }}
                                >
                                  Delete Listing
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No listings found. Try adjusting your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>

                {Array.from({ length: totalPages }).map((_, index) => (
                  <PaginationItem key={index}>
                    <PaginationLink isActive={currentPage === index + 1} onClick={() => setCurrentPage(index + 1)}>
                      {index + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </main>
      <footer className="w-full border-t bg-background py-4">
        <div className="container">
          <p className="text-center text-sm text-muted-foreground">
            © 2025 Culture Alberta Admin. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

// Sample data for Best of Alberta listings
const mockBestOfItems = [
  {
    id: "d1",
    name: "Smile Dental Care",
    description: "Award-winning dental practice offering comprehensive care with the latest technology.",
    image: "/placeholder.svg?height=400&width=600&text=Smile+Dental",
    location: "Edmonton, AB",
    category: "Dentists",
    rating: 4.9,
  },
  {
    id: "d2",
    name: "Calgary Family Dentistry",
    description: "Family-friendly dental clinic specializing in preventative care and cosmetic dentistry.",
    image: "/placeholder.svg?height=400&width=600&text=Calgary+Family+Dentistry",
    location: "Calgary, AB",
    category: "Dentists",
    rating: 4.8,
  },
  {
    id: "l1",
    name: "Alberta Legal Partners",
    description: "Full-service law firm with expertise in corporate, family, and real estate law.",
    image: "/placeholder.svg?height=400&width=600&text=Alberta+Legal+Partners",
    location: "Calgary, AB",
    category: "Lawyers",
    rating: 4.9,
  },
  {
    id: "l2",
    name: "Edmonton Law Group",
    description: "Experienced legal team specializing in personal injury and insurance claims.",
    image: "/placeholder.svg?height=400&width=600&text=Edmonton+Law+Group",
    location: "Edmonton, AB",
    category: "Lawyers",
    rating: 4.8,
  },
  {
    id: "r1",
    name: "The Prairie Table",
    description: "Farm-to-table restaurant showcasing the best of Alberta's local ingredients and cuisine.",
    image: "/placeholder.svg?height=400&width=600&text=Prairie+Table",
    location: "Edmonton, AB",
    category: "Restaurants",
    rating: 4.9,
  },
  {
    id: "r2",
    name: "Calgary Steakhouse",
    description: "Premium steakhouse featuring Alberta's world-famous beef and extensive wine selection.",
    image: "/placeholder.svg?height=400&width=600&text=Calgary+Steakhouse",
    location: "Calgary, AB",
    category: "Restaurants",
    rating: 4.8,
  },
]
