interface EventSchemaProps {
  event: {
    title: string
    description: string
    startDate: string
    endDate?: string
    location: {
      name: string
      address: string
      city: string
      province: string
      postalCode: string
    }
    image?: string
    price?: string
    organizer: string
    category: string
  }
  baseUrl?: string
}

export function EventSchema({ event, baseUrl = 'https://www.culturealberta.com' }: EventSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": event.title,
    "description": event.description,
    "startDate": event.startDate,
    "endDate": event.endDate || event.startDate,
    "location": {
      "@type": "Place",
      "name": event.location.name,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": event.location.address,
        "addressLocality": event.location.city,
        "addressRegion": event.location.province,
        "postalCode": event.location.postalCode,
        "addressCountry": "CA"
      }
    },
    "image": event.image || `${baseUrl}/images/placeholder.jpg`,
    "offers": {
      "@type": "Offer",
      "price": event.price || "0",
      "priceCurrency": "CAD",
      "availability": "https://schema.org/InStock"
    },
    "organizer": {
      "@type": "Organization",
      "name": event.organizer
    },
    "eventCategory": event.category,
    "inLanguage": "en-CA",
    "audience": {
      "@type": "Audience",
      "audienceType": "General"
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema)
      }}
    />
  )
}
