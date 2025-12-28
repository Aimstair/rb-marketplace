import { Listing } from "@prisma/client" // Adjust import based on your types

export function JsonLd({ listing }: { listing: any }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": listing.title,
    "image": listing.image,
    "description": listing.description,
    "offers": {
      "@type": "Offer",
      "price": listing.price,
      "priceCurrency": "PHP",
      "availability": listing.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "url": `https://rbmarket.com/listing/${listing.id}`
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}