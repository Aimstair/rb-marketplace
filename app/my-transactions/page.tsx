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
import { Search, ChevronLeft, ChevronRight } from "lucide-react"

const MY_TRANSACTIONS = [
  {
    id: 1,
    type: "sold",
    item: "Golden Dragon Pet",
    buyer: "FastBuyer123",
    amount: 2500,
    date: "2024-11-20",
    status: "completed",
  },
  {
    id: 2,
    type: "bought",
    item: "Blox Fruits Sword",
    seller: "CurrencyKing",
    amount: 1800,
    date: "2024-11-18",
    status: "completed",
  },
  {
    id: 3,
    type: "sold",
    item: "UGC Bundle Pack",
    buyer: "LimitedHunter",
    amount: 890,
    date: "2024-11-15",
    status: "completed",
  },
  {
    id: 4,
    type: "bought",
    item: "Pet Simulator Tokens",
    seller: "SafeTrader99",
    amount: 1200,
    date: "2024-11-10",
    status: "completed",
  },
  {
    id: 5,
    type: "sold",
    item: "5000 Robux",
    buyer: "NewPlayer456",
    amount: 4500,
    date: "2024-11-05",
    status: "pending_payment",
  },
  {
    id: 6,
    type: "bought",
    item: "Mega Neon Unicorn",
    seller: "TradeMaster",
    amount: 3200,
    date: "2024-11-03",
    status: "completed",
  },
  {
    id: 7,
    type: "sold",
    item: "Godly Knife Set",
    buyer: "ProCollector",
    amount: 1500,
    date: "2024-10-28",
    status: "completed",
  },
  {
    id: 8,
    type: "bought",
    item: "Limited Hat",
    seller: "RareFinds",
    amount: 2800,
    date: "2024-10-25",
    status: "completed",
  },
  {
    id: 9,
    type: "sold",
    item: "Dragon Fruit",
    buyer: "FruitHunter",
    amount: 950,
    date: "2024-10-20",
    status: "completed",
  },
  {
    id: 10,
    type: "bought",
    item: "Shadow Dragon",
    seller: "PetKing99",
    amount: 5500,
    date: "2024-10-15",
    status: "completed",
  },
  {
    id: 11,
    type: "sold",
    item: "Leopard Fruit",
    buyer: "BloxMaster",
    amount: 1100,
    date: "2024-10-10",
    status: "completed",
  },
  {
    id: 12,
    type: "bought",
    item: "Dominus Replica",
    seller: "UGCKing",
    amount: 750,
    date: "2024-10-05",
    status: "completed",
  },
]

const ITEMS_PER_PAGE = 5

export default function MyTransactionsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)

  // Filter transactions
  const filteredTransactions = MY_TRANSACTIONS.filter((tx) => {
    const matchesSearch =
      tx.item.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.buyer?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (tx.seller?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    const matchesType = typeFilter === "all" || tx.type === typeFilter
    const matchesStatus = statusFilter === "all" || tx.status === statusFilter
    return matchesSearch && matchesType && matchesStatus
  })

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  // Reset to page 1 when filters change
  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
    }
  }, [user, router])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, typeFilter, statusFilter])

  if (!user) return null

  const getStatusColor = (status: string) => {
    if (status === "completed") return "bg-green-100 text-green-800"
    if (status === "pending_payment") return "bg-yellow-100 text-yellow-800"
    return "bg-blue-100 text-blue-800"
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
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending_payment">Pending</SelectItem>
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
                {paginatedTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b hover:bg-muted/50">
                    <td className="px-6 py-4">
                      <Badge variant={tx.type === "sold" ? "default" : "secondary"}>
                        {tx.type === "sold" ? "Sold" : "Bought"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-medium">{tx.item}</td>
                    <td className="px-6 py-4 text-sm">{tx.type === "sold" ? tx.buyer : tx.seller}</td>
                    <td className="px-6 py-4 font-bold text-primary">₱{tx.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{tx.date}</td>
                    <td className="px-6 py-4">
                      <Badge className={getStatusColor(tx.status)}>
                        {tx.status === "completed" ? "Completed" : "Pending"}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {paginatedTransactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      No transactions found
                    </td>
                  </tr>
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
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </main>
    </>
  )
}
