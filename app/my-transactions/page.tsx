"use client"

import Navigation from "@/components/navigation"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { getTransactions } from "@/app/actions/transactions"
import type { TransactionData } from "@/app/actions/transactions"

const ITEMS_PER_PAGE = 5

export default function MyTransactionsPage() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const router = useRouter()
  const [transactions, setTransactions] = useState<TransactionData[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)

  // Load transactions on mount
  useEffect(() => {
    if (isAuthLoading) return
    if (!user) {
      router.push("/auth/login")
      return
    }

    const loadTransactions = async () => {
      setLoading(true)
      try {
        // Determine role filter based on typeFilter
        let roleFilter: "buyer" | "seller" | undefined = undefined
        if (typeFilter === "sold") roleFilter = "seller"
        else if (typeFilter === "bought") roleFilter = "buyer"

        const result = await getTransactions(roleFilter)
        if (result.success && result.transactions) {
          setTransactions(result.transactions)
        }
      } catch (error) {
        console.error("Error loading transactions:", error)
      } finally {
        setLoading(false)
      }
    }

    loadTransactions()
  }, [user, isAuthLoading, router, typeFilter])

  // Filter transactions based on search and status
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.buyer.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.seller.username.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || tx.status.toLowerCase() === statusFilter.toLowerCase()
    return matchesSearch && matchesStatus
  })

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter])

  if (isAuthLoading) {
    return (
      <>
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </>
    )
  }

  if (!user) return null

  const getStatusColor = (status: string) => {
    if (status === "COMPLETED") return "bg-green-100 text-green-800"
    if (status === "PENDING") return "bg-yellow-100 text-yellow-800"
    if (status === "CANCELLED") return "bg-red-100 text-red-800"
    return "bg-blue-100 text-blue-800"
  }

  const getTransactionType = (tx: TransactionData) => {
    return tx.buyerId === user.id ? "bought" : "sold"
  }

  const getCounterparty = (tx: TransactionData) => {
    return tx.buyerId === user.id ? tx.seller.username : tx.buyer.username
  }

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Transactions</h1>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by item, buyer, or seller..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="bought">Bought</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Item</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Party</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Amount</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                    </td>
                  </tr>
                ) : paginatedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map((tx) => (
                    <tr key={tx.id} className="border-b hover:bg-muted/50">
                      <td className="px-6 py-4">
                        <Badge variant={getTransactionType(tx) === "sold" ? "default" : "secondary"}>
                          {getTransactionType(tx) === "sold" ? "Sold" : "Bought"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-medium">{tx.listing.title}</td>
                      <td className="px-6 py-4 text-sm">{getCounterparty(tx)}</td>
                      <td className="px-6 py-4 font-bold text-primary">₱{tx.price.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={getStatusColor(tx.status)}>
                          {tx.status === "PENDING"
                            ? "Pending"
                            : tx.status === "COMPLETED"
                              ? "Completed"
                              : "Cancelled"}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredTransactions.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredTransactions.length)} of{" "}
                {filteredTransactions.length} transactions
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-8"
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </main>
    </>
  )
}
