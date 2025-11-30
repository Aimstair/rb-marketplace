"use client"

import Navigation from "@/components/navigation"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Loader2 } from "lucide-react"
import { getTransactions } from "@/app/actions/transactions"
import type { TransactionData } from "@/app/actions/transactions"
import { TransactionCard } from "@/components/transaction-card"

const ITEMS_PER_PAGE = 10

export default function MyTransactionsPage() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const router = useRouter()
  const [transactions, setTransactions] = useState<TransactionData[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("buying")
  const [currentPageBuying, setCurrentPageBuying] = useState(1)
  const [currentPageSelling, setCurrentPageSelling] = useState(1)
  const [loading, setLoading] = useState(true)

  // Load transactions on mount and when activeTab changes
  useEffect(() => {
    if (isAuthLoading) return
    if (!user) {
      router.push("/auth/login")
      return
    }

    const loadTransactions = async () => {
      setLoading(true)
      try {
        const result = await getTransactions()
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
  }, [user, isAuthLoading, router])

  // Filter transactions based on tab and search
  const buyingTransactions = transactions.filter(
    (tx) =>
      tx.buyerId === user?.id &&
      (tx.listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.seller.username.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const sellingTransactions = transactions.filter(
    (tx) =>
      tx.sellerId === user?.id &&
      (tx.listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.buyer.username.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Pagination logic
  const totalPagesBuying = Math.ceil(buyingTransactions.length / ITEMS_PER_PAGE)
  const startIndexBuying = (currentPageBuying - 1) * ITEMS_PER_PAGE
  const paginatedBuying = buyingTransactions.slice(startIndexBuying, startIndexBuying + ITEMS_PER_PAGE)

  const totalPagesSelling = Math.ceil(sellingTransactions.length / ITEMS_PER_PAGE)
  const startIndexSelling = (currentPageSelling - 1) * ITEMS_PER_PAGE
  const paginatedSelling = sellingTransactions.slice(startIndexSelling, startIndexSelling + ITEMS_PER_PAGE)

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPageBuying(1)
    setCurrentPageSelling(1)
  }, [searchQuery])

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

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Transactions</h1>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by item or other party..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buying">
              Buying ({buyingTransactions.length})
            </TabsTrigger>
            <TabsTrigger value="selling">
              Selling ({sellingTransactions.length})
            </TabsTrigger>
          </TabsList>

          {/* Buying Tab */}
          <TabsContent value="buying" className="space-y-4 mt-6">
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : paginatedBuying.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {buyingTransactions.length === 0 ? "You haven't bought anything yet." : "No transactions match your search."}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {paginatedBuying.map((tx) => (
                    <TransactionCard
                      key={tx.id}
                      transaction={tx}
                      currentUserId={user.id}
                      onUpdate={() => {
                        // Refresh transactions
                        const loadTransactions = async () => {
                          const result = await getTransactions()
                          if (result.success && result.transactions) {
                            setTransactions(result.transactions)
                          }
                        }
                        loadTransactions()
                      }}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPagesBuying > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPageBuying((p) => Math.max(1, p - 1))}
                      disabled={currentPageBuying === 1}
                    >
                      Previous
                    </Button>
                    {Array.from({ length: totalPagesBuying }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPageBuying === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPageBuying(page)}
                        className="w-8"
                      >
                        {page}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPageBuying((p) => Math.min(totalPagesBuying, p + 1))}
                      disabled={currentPageBuying === totalPagesBuying}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Selling Tab */}
          <TabsContent value="selling" className="space-y-4 mt-6">
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : paginatedSelling.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {sellingTransactions.length === 0 ? "You haven't sold anything yet." : "No transactions match your search."}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {paginatedSelling.map((tx) => (
                    <TransactionCard
                      key={tx.id}
                      transaction={tx}
                      currentUserId={user.id}
                      onUpdate={() => {
                        // Refresh transactions
                        const loadTransactions = async () => {
                          const result = await getTransactions()
                          if (result.success && result.transactions) {
                            setTransactions(result.transactions)
                          }
                        }
                        loadTransactions()
                      }}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPagesSelling > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPageSelling((p) => Math.max(1, p - 1))}
                      disabled={currentPageSelling === 1}
                    >
                      Previous
                    </Button>
                    {Array.from({ length: totalPagesSelling }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPageSelling === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPageSelling(page)}
                        className="w-8"
                      >
                        {page}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPageSelling((p) => Math.min(totalPagesSelling, p + 1))}
                      disabled={currentPageSelling === totalPagesSelling}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </>
  )
}
