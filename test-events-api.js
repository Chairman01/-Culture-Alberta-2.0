// Simple test to check what's in the events table
const testEvents = async () => {
  try {
    console.log('Testing events API...')
    
    const response = await fetch('http://localhost:3004/api/test-articles')
    const data = await response.json()
    
    console.log('Response:', data)
    
    // Check if there are any events in the response
    const events = data.filter(item => item.type === 'event' || item.type === 'Event')
    console.log('Events found:', events.length)
    console.log('Event details:', events.map(e => ({ id: e.id, title: e.title, type: e.type })))
    
  } catch (error) {
    console.error('Error:', error)
  }
}

testEvents()
