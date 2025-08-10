"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, Search } from "lucide-react"
import { getAllPosts, deletePost, BlogPost } from "@/lib/posts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

export default function AdminDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    loadPosts()
  }, [])

  async function loadPosts() {
    try {
      const allPosts = await getAllPosts()
      setPosts(allPosts)
    } catch (error) {
      console.error("Error loading posts:", error)
      toast({
        title: "Error loading posts",
        description: "There was a problem loading your posts.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this post?")) {
      return
    }

    try {
      await deletePost(id)
      toast({
        title: "Post deleted",
        description: "The post has been deleted successfully.",
      })
      loadPosts() // Reload the posts list
    } catch (error) {
      console.error("Error deleting post:", error)
      toast({
        title: "Error deleting post",
        description: "There was a problem deleting the post.",
        variant: "destructive",
      })
    }
  }

  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.tags.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading posts...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <h1 className="text-lg font-semibold">Admin Dashboard</h1>
          <Button asChild>
            <Link href="/admin/new-post">
              <Plus className="mr-2 h-4 w-4" />
              New Post
            </Link>
          </Button>
        </div>
      </header>
      <main className="flex-1 container py-10">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <div className="grid grid-cols-12 gap-4 p-4 font-medium border-b">
              <div className="col-span-4">Title</div>
              <div className="col-span-2">Category</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-2">Tags</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            {filteredPosts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No posts found
              </div>
            ) : (
              filteredPosts.map((post) => (
                <div
                  key={post.id}
                  className="grid grid-cols-12 gap-4 p-4 items-center border-b last:border-0"
                >
                  <div className="col-span-4">
                    <div className="font-medium">{post.title}</div>
                    <div className="text-sm text-muted-foreground line-clamp-1">
                      {post.excerpt}
                    </div>
                  </div>
                  <div className="col-span-2">{post.category}</div>
                  <div className="col-span-2">
                    {new Date(post.created_at).toLocaleDateString()}
                  </div>
                  <div className="col-span-2">
                    <div className="flex flex-wrap gap-1">
                      {post.tags.split(',').map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                        >
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-2 flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/admin/edit-post/${post.id}`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(post.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
