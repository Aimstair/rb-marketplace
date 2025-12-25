import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withRateLimit } from "@/app/api/middleware/rate-limit"

export async function GET(request: NextRequest) {
  return withRateLimit(request, async () => {
    try {
      const maintenanceSetting = await prisma.systemSettings.findUnique({
        where: { key: "maintenance_mode" },
      })

      const maintenanceMode = maintenanceSetting?.value === "true"

      return NextResponse.json({ maintenanceMode })
    } catch (error) {
      console.error("Error fetching maintenance mode:", error)
      return NextResponse.json({ maintenanceMode: false }, { status: 200 })
    }
  })
}
