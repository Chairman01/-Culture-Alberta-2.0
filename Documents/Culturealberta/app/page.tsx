export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Culture Alberta</h1>
        <p className="text-xl text-gray-600 mb-8">
          Welcome to Alberta's cultural hub
        </p>
        <div className="space-y-4">
          <a href="/edmonton" className="block p-4 border rounded hover:bg-gray-50">
            Edmonton
          </a>
          <a href="/calgary" className="block p-4 border rounded hover:bg-gray-50">
            Calgary
          </a>
          <a href="/events" className="block p-4 border rounded hover:bg-gray-50">
            Events
          </a>
        </div>
      </div>
    </div>
  )
}
