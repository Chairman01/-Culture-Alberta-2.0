export default function ArticlePage({ params }: { params: { slug: string } }) {
  return <div>Test Page: {params.slug}</div>
} 