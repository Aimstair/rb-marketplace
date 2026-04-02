interface SeoListing {
  id: string
  title: string
  image?: string | null
  description?: string | null
  price?: number | null
  ratePerPeso?: number | null
  stock?: number | null
  listingType?: string | null
  sellerName?: string | null
  sellerUrl?: string | null
  reviewCount?: number | null
  ratingValue?: number | null
  priceCurrency?: string | null
}

interface JsonLdProps {
  listing: SeoListing
  urlPath?: string
}

const DEFAULT_SITE_URL = "https://rbmarket.app"

function getSiteUrl(): string {
  const candidate = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || DEFAULT_SITE_URL
  try {
    return new URL(candidate).toString().replace(/\/$/, "")
  } catch {
    return DEFAULT_SITE_URL
  }
}

function toAbsoluteUrl(baseUrl: string, pathOrUrl?: string | null): string | undefined {
  if (!pathOrUrl) {
    return undefined
  }

  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl
  }

  return `${baseUrl}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`
}

interface OrganizationJsonLdProps {
  name?: string
  description?: string
  logoPath?: string
  sameAs?: string[]
}

interface WebsiteJsonLdProps {
  name?: string
  description?: string
}

interface WebPageJsonLdProps {
  name: string
  description: string
  path: string
  inLanguage?: string
}

interface CollectionPageJsonLdProps {
  name: string
  description: string
  path: string
  itemCount?: number
  inLanguage?: string
}

interface PersonJsonLdProps {
  name: string
  profilePath: string
  description?: string
  image?: string | null
  sameAs?: string[]
  alternateName?: string[]
  isVerified?: boolean
  reviewCount?: number
  ratingValue?: number
}

export function OrganizationJsonLd({
  name = "RbMarket",
  description = "Peer-to-peer Roblox marketplace for safer item and currency trading.",
  logoPath = "/logo.png",
  sameAs = [],
}: OrganizationJsonLdProps) {
  const siteUrl = getSiteUrl()
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name,
    url: siteUrl,
    logo: toAbsoluteUrl(siteUrl, logoPath),
    description,
  }

  if (sameAs.length > 0) {
    jsonLd.sameAs = sameAs.filter(Boolean)
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
}

export function WebsiteJsonLd({
  name = "RbMarket",
  description = "Peer-to-peer Roblox marketplace for safer item and currency trading.",
}: WebsiteJsonLdProps) {
  const siteUrl = getSiteUrl()
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name,
    url: siteUrl,
    description,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/marketplace?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
}

export function WebPageJsonLd({
  name,
  description,
  path,
  inLanguage = "en",
}: WebPageJsonLdProps) {
  const siteUrl = getSiteUrl()
  const pageUrl = toAbsoluteUrl(siteUrl, path)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description,
    url: pageUrl,
    mainEntityOfPage: pageUrl,
    isPartOf: {
      "@id": `${siteUrl}/#website`,
    },
    inLanguage,
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
}

export function CollectionPageJsonLd({
  name,
  description,
  path,
  itemCount,
  inLanguage = "en",
}: CollectionPageJsonLdProps) {
  const siteUrl = getSiteUrl()
  const pageUrl = toAbsoluteUrl(siteUrl, path)
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: pageUrl,
    mainEntityOfPage: pageUrl,
    isPartOf: {
      "@id": `${siteUrl}/#website`,
    },
    inLanguage,
  }

  if (typeof itemCount === "number" && Number.isFinite(itemCount) && itemCount >= 0) {
    jsonLd.numberOfItems = Math.floor(itemCount)
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
}

export function PersonJsonLd({
  name,
  profilePath,
  description,
  image,
  sameAs = [],
  alternateName = [],
  isVerified,
  reviewCount,
  ratingValue,
}: PersonJsonLdProps) {
  const siteUrl = getSiteUrl()
  const profileUrl = toAbsoluteUrl(siteUrl, profilePath)
  const safeReviewCount = Number(reviewCount ?? 0)
  const safeRatingValue = Number(ratingValue ?? 0)

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    url: profileUrl,
    mainEntityOfPage: profileUrl,
    description,
    image: toAbsoluteUrl(siteUrl, image),
    alternateName: alternateName.filter(Boolean),
  }

  if (sameAs.length > 0) {
    jsonLd.sameAs = sameAs.filter(Boolean)
  }

  if (isVerified) {
    jsonLd.knowsAbout = ["Roblox item trading", "Roblox currency trading"]
  }

  if (safeReviewCount > 0 && safeRatingValue > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: safeRatingValue,
      reviewCount: safeReviewCount,
      bestRating: 5,
      worstRating: 1,
    }
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
}

export function JsonLd({ listing, urlPath }: JsonLdProps) {
  const normalizedBase = getSiteUrl()
  const derivedPath =
    urlPath ||
    (listing.listingType?.toUpperCase() === "CURRENCY"
      ? `/currency/${listing.id}`
      : `/listing/${listing.id}`)
  const price = Number(listing.ratePerPeso ?? listing.price ?? 0)
  const stock = Number(listing.stock ?? 0)
  const reviewCount = Number(listing.reviewCount ?? 0)
  const ratingValue = Number(listing.ratingValue ?? 0)
  const priceCurrency = (listing.priceCurrency || "PHP").toUpperCase()
  const listingLabel = listing.listingType?.toUpperCase() === "CURRENCY" ? "Currency Listing" : "Listing"

  const productSchema: Record<string, unknown> = {
    "@type": "Product",
    name: listing.title,
    image: listing.image || undefined,
    description: listing.description,
    offers: {
      "@type": "Offer",
      price: Number.isFinite(price) ? price : 0,
      priceCurrency,
      availability: stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${normalizedBase}${derivedPath}`,
    },
  }

  if (listing.sellerName) {
    productSchema.seller = {
      "@type": "Person",
      name: listing.sellerName,
      url: listing.sellerUrl ? `${normalizedBase}${listing.sellerUrl}` : undefined,
    }
  }

  if (reviewCount > 0 && ratingValue > 0) {
    productSchema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue,
      reviewCount,
      bestRating: 5,
      worstRating: 1,
    }
  }

  const breadcrumbSchema = {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${normalizedBase}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: listing.listingType?.toUpperCase() === "CURRENCY" ? "Currency" : "Marketplace",
        item:
          listing.listingType?.toUpperCase() === "CURRENCY"
            ? `${normalizedBase}/currency`
            : `${normalizedBase}/marketplace`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: listingLabel,
        item: `${normalizedBase}${derivedPath}`,
      },
    ],
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [productSchema, breadcrumbSchema],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}