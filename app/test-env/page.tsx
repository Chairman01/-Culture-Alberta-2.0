export default function TestEnvPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Environment Variables Test</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Supabase URL:</h2>
          <p className="bg-gray-100 p-2 rounded">
            {supabaseUrl || 'Not set'}
          </p>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold">Supabase Key:</h2>
          <p className="bg-gray-100 p-2 rounded font-mono text-sm">
            {supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'Not set'}
          </p>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold">Node Environment:</h2>
          <p className="bg-gray-100 p-2 rounded">
            {process.env.NODE_ENV}
          </p>
        </div>
      </div>
    </div>
  )
}
