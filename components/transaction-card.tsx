"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle } from "lucide-react"
import { toggleTransactionConfirmation, cancelTransaction } from "@/app/actions/transactions"
import type { TransactionData } from "@/app/actions/transactions"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

interface TransactionCardProps {
  transaction: TransactionData
  currentUserId: string
  onUpdate?: () => void
}

export function TransactionCard({ transaction, currentUserId, onUpdate }: TransactionCardProps) {
  const [isConfirming, setIsConfirming] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const { toast } = useToast()

  const isBuyer = transaction.buyerId === currentUserId
  const counterpartyName = isBuyer ? transaction.seller.username : transaction.buyer.username
  const transactionType = isBuyer ? "Bought" : "Sold"

  const handleConfirm = async () => {
    setIsConfirming(true)
    try {
      const result = await toggleTransactionConfirmation(transaction.id)
      if (result.success) {
        toast({
          title: "Success",
          description: isBuyer
            ? "Marked as received! Waiting for seller confirmation."
            : "Marked as received! Waiting for buyer confirmation.",
        })
        onUpdate?.()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to confirm transaction",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsConfirming(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this order?")) return

    setIsCancelling(true)
    try {
      const result = await cancelTransaction(transaction.id)
      if (result.success) {
        toast({
          title: "Success",
          description: "Order cancelled",
        })
        onUpdate?.()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to cancel transaction",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsCancelling(false)
    }
  }

  const getStatusColor = (status: string) => {
    if (status === "COMPLETED") return "bg-green-100 text-green-800"
    if (status === "PENDING") return "bg-yellow-100 text-yellow-800"
    if (status === "CANCELLED") return "bg-red-100 text-red-800"
    return "bg-blue-100 text-blue-800"
  }

  const getStatusLabel = (status: string) => {
    if (status === "COMPLETED") return "Completed"
    if (status === "PENDING") return "Pending"
    if (status === "CANCELLED") return "Cancelled"
    return status
  }

  const userConfirmed = isBuyer ? transaction.buyerConfirmed : transaction.sellerConfirmed
  const counterpartyConfirmed = isBuyer ? transaction.sellerConfirmed : transaction.buyerConfirmed

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Image */}
          <div className="flex-shrink-0">
            <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted">
              {transaction.listing.image ? (
                <Image
                  src={transaction.listing.image}
                  alt={transaction.listing.title}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement
                    img.src = "/placeholder.jpg"
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                  No image
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
              <div className="flex-1">
                <h3 className="font-semibold truncate">{transaction.listing.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {transactionType} from <span className="font-medium">{counterpartyName}</span>
                </p>
              </div>
              <Badge className={getStatusColor(transaction.status)}>
                {getStatusLabel(transaction.status)}
              </Badge>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm mb-4">
              <span className="font-bold text-primary">₱{transaction.price.toLocaleString()}</span>
              <span className="text-muted-foreground">
                {new Date(transaction.createdAt).toLocaleDateString()}
              </span>
            </div>

            {/* Action Buttons and Status */}
            <div className="flex flex-col gap-3">
              {transaction.status === "PENDING" && (
                <>
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={handleConfirm}
                      disabled={isConfirming}
                      size="sm"
                      variant="default"
                      className="w-full sm:w-auto"
                    >
                      {isConfirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isBuyer ? "I have received the item" : "I have received payment"}
                    </Button>

                    <Button
                      onClick={handleCancel}
                      disabled={isCancelling}
                      size="sm"
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Cancel Order
                    </Button>
                  </div>

                  {/* Confirmation Status */}
                  <div className="mt-2 p-3 bg-muted rounded-lg space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <div
                        className={`w-2 h-2 rounded-full ${userConfirmed ? "bg-green-500" : "bg-gray-300"}`}
                      />
                      <span>{isBuyer ? "You" : "You"} confirmed: {userConfirmed ? "✓" : "Pending"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div
                        className={`w-2 h-2 rounded-full ${counterpartyConfirmed ? "bg-green-500" : "bg-gray-300"}`}
                      />
                      <span>{counterpartyName} confirmed: {counterpartyConfirmed ? "✓" : "Pending"}</span>
                    </div>
                    {userConfirmed && !counterpartyConfirmed && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                        <AlertCircle className="h-3 w-3" />
                        Waiting for {counterpartyName} to confirm
                      </div>
                    )}
                  </div>
                </>
              )}

              {transaction.status === "COMPLETED" && (
                <Button size="sm" variant="default" className="w-full sm:w-auto" disabled>
                  ✓ Transaction Completed
                </Button>
              )}

              {transaction.status === "CANCELLED" && (
                <Button size="sm" variant="destructive" className="w-full sm:w-auto" disabled>
                  ✗ Order Cancelled
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
