import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import AdminSidebar from "@/components/admin/admin-sidebar"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth()

  // Check if user is authenticated
  if (!session || !session.user) {
    console.log("[Admin Layout] No session found, redirecting to login")
    redirect("/auth/login?redirect=/admin")
  }

  // Check if user is admin
  const userRole = (session.user as any).role
  console.log("[Admin Layout] User role:", userRole)

  if (userRole !== "admin") {
    console.log("[Admin Layout] User is not admin, redirecting to home")
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <main className="ml-64 min-h-screen overflow-auto">{children}</main>
    </div>
  )
}
