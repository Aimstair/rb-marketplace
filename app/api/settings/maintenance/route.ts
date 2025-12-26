import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Force the route to fetch fresh data every time (no caching)
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const maintenanceSetting = await prisma.systemSettings.findUnique({
      where: { key: "maintenance_mode" },
    })

    // Safely parse the value
    const maintenanceMode = maintenanceSetting?.value === "true"

    return NextResponse.json({ maintenanceMode })
  } catch (error) {
    // Log the error for your DigitalOcean console
    console.error("Critical: Error fetching maintenance mode from DB:", error)
    
    // Return false on error so the site doesn't get stuck 
    // in an unreachable state for everyone.
    return NextResponse.json({ maintenanceMode: false }, { status: 200 })
  }
}