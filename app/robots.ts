import { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/auth/",
          "/*.json$",
          "/*?*sort=",
          "/*?*filter=",
          "/messages",
          "/my-listings",
          "/my-transactions",
          "/settings",
          "/notifications",
        ],
      },
      // Specific rules for common bots
      {
        userAgent: "Googlebot",
        allow: "/",
        crawlDelay: 0,
      },
      {
        userAgent: "Bingbot",
        allow: "/",
        crawlDelay: 1,
      },
    ],
    sitemap: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/sitemap.xml`,
  }
}
