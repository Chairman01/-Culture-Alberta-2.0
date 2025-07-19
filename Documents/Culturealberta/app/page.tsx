export default function Home() {
  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif', 
      margin: 0, 
      padding: '20px',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{ 
        textAlign: 'center',
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        maxWidth: '500px'
      }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          marginBottom: '20px',
          color: '#333'
        }}>
          Culture Alberta
        </h1>
        <p style={{ 
          fontSize: '1.2rem', 
          color: '#666',
          marginBottom: '30px'
        }}>
          Welcome to Alberta's cultural hub
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <a href="/edmonton" style={{
            padding: '15px',
            border: '1px solid #ddd',
            borderRadius: '5px',
            textDecoration: 'none',
            color: '#333',
            backgroundColor: '#f9f9f9'
          }}>
            Edmonton
          </a>
          <a href="/calgary" style={{
            padding: '15px',
            border: '1px solid #ddd',
            borderRadius: '5px',
            textDecoration: 'none',
            color: '#333',
            backgroundColor: '#f9f9f9'
          }}>
            Calgary
          </a>
          <a href="/events" style={{
            padding: '15px',
            border: '1px solid #ddd',
            borderRadius: '5px',
            textDecoration: 'none',
            color: '#333',
            backgroundColor: '#f9f9f9'
          }}>
            Events
          </a>
        </div>
      </div>
    </div>
  )
}
