"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, Clock, Loader2, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toggleTransactionConfirmation, cancelTransaction } from "@/app/actions/transactions"
import type { TransactionData } from "@/app/actions/transactions"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface TransactionCardProps {
  transaction: TransactionData
  currentUserId: string
  onUpdate?: () => void
}

const STATUS = {
  PENDING: { label: "In progress", className: "bg-warning/15 text-warning" },
  COMPLETED: { label: "Completed", className: "bg-success/15 text-success" },
  CANCELLED: { label: "Cancelled", className: "bg-destructive/15 text-destructive" },
} as const

function listingHref(tx: TransactionData) {
  if (!tx.listing.id) return null
  if (tx.listingType === "CURRENCY") return `/currency/${tx.listing.id}`
  if (tx.listingType === "ITEM") return `/listing/${tx.listing.id}`
  return null
}

/**
 * One order on My Transactions. Both sides confirm (buyer: item received, seller: payment
 * received) and the order completes once both have; confirming again undoes it.
 */
export function TransactionCard({ transaction, currentUserId, onUpdate }: TransactionCardProps) {
  const [isConfirming, setIsConfirming] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const { toast } = useToast()

  const isBuyer = transaction.buyerId === currentUserId
  const counterparty = isBuyer ? transaction.seller.username : transaction.buyer.username
  const userConfirmed = isBuyer ? transaction.buyerConfirmed : transaction.sellerConfirmed
  const counterpartyConfirmed = isBuyer ? transaction.sellerConfirmed : transaction.buyerConfirmed
  const status = STATUS[transaction.status] ?? STATUS.PENDING
  const href = listingHref(transaction)
  const pending = transaction.status === "PENDING"

  const handleConfirm = async () => {
    setIsConfirming(true)
    try {
      const result = await toggleTransactionConfirmation(transaction.id)
      if (result.success) {
        toast({
          title: userConfirmed
            ? "Confirmation undone"
            : counterpartyConfirmed
              ? "Order completed"
              : `Confirmed. Waiting for ${counterparty}`,
        })
        onUpdate?.()
      } else {
        toast({ title: result.error || "Couldn't update the order", variant: "destructive" })
      }
    } catch {
      toast({ title: "Something went wrong. Please try again.", variant: "destructive" })
    } finally {
      setIsConfirming(false)
    }
  }

  const handleCancel = async () => {
    setIsCancelling(true)
    try {
      const result = await cancelTransaction(transaction.id)
      if (result.success) {
        toast({ title: "Order cancelled" })
        setCancelOpen(false)
        onUpdate?.()
      } else {
        toast({ title: result.error || "Couldn't cancel the order", variant: "destructive" })
      }
    } catch {
      toast({ title: "Something went wrong. Please try again.", variant: "destructive" })
    } finally {
      setIsCancelling(false)
    }
  }

  const title = (
    <span className="line-clamp-2 text-[17px] font-semibold leading-snug">{transaction.listing.title}</span>
  )

  return (
    <article className="rounded-[20px] bg-card p-4 sm:p-5">
      <div className="flex gap-4">
        <div className="grid size-[72px] shrink-0 place-items-center overflow-hidden rounded-[14px] bg-secondary sm:size-20">
          {transaction.listing.image && !imageFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={transaction.listing.image}
              alt=""
              className="h-full w-full object-contain p-[8%]"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <Package className="size-6 text-muted-foreground" strokeWidth={1.5} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            {href ? (
              <Link href={href} className="min-w-0 hover:underline underline-offset-2">
                {title}
              </Link>
            ) : (
              <div className="min-w-0">{title}</div>
            )}
            <span className="shrink-0 text-[17px] font-semibold tabular-nums">
              ₱{transaction.price.toLocaleString()}
            </span>
          </div>

          <p className="mt-1 text-[14px] text-muted-foreground">
            {isBuyer ? "From" : "To"} <span className="text-foreground">{counterparty}</span>
            {transaction.amount ? <> · Qty {transaction.amount.toLocaleString()}</> : null}
            {" · "}
            {new Date(transaction.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
          </p>

          <span className={cn("mt-2.5 inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-medium", status.className)}>
            {status.label}
          </span>
        </div>
      </div>

      {pending && (
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[14px]">
            <ConfirmStep done={userConfirmed} label={isBuyer ? "You received the item" : "You received payment"} />
            <ConfirmStep
              done={counterpartyConfirmed}
              label={isBuyer ? `${counterparty} received payment` : `${counterparty} received the item`}
            />
          </div>

          <div className="flex shrink-0 gap-2">
            <Button variant="ghost" size="sm" onClick={() => setCancelOpen(true)} disabled={isCancelling || isConfirming}>
              Cancel order
            </Button>
            <Button
              size="sm"
              variant={userConfirmed ? "secondary" : "default"}
              onClick={handleConfirm}
              disabled={isConfirming || isCancelling}
            >
              {isConfirming && <Loader2 className="size-4 animate-spin" />}
              {userConfirmed ? "Undo confirmation" : isBuyer ? "I received the item" : "I received payment"}
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={cancelOpen} onOpenChange={(open) => !isCancelling && setCancelOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
            <AlertDialogDescription>
              The order for &ldquo;{transaction.listing.title}&rdquo; with {counterparty} will be cancelled. This can&apos;t be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Keep order</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleCancel()
              }}
              disabled={isCancelling}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isCancelling && <Loader2 className="size-4 animate-spin" />}
              Cancel order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  )
}

function ConfirmStep({ done, label }: { done: boolean; label: string }) {
  return (
    <span className={cn("flex items-center gap-1.5", done ? "text-foreground" : "text-muted-foreground")}>
      {done ? (
        <Check className="size-4 text-success" strokeWidth={2.25} />
      ) : (
        <Clock className="size-4" strokeWidth={1.75} />
      )}
      {label}
    </span>
  )
}
