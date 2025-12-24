"use client"

import type React from "react"

import Navigation from "@/components/navigation"
import { useAuth } from "@/lib/auth-context"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useEffect, useState, useRef } from "react"
import {
  MessageCircle,
  Send,
  CheckCircle,
  Star,
  Package,
  Flag,
  AlertTriangle,
  DollarSign,
  Paperclip,
  Search,
  Ban,
  Filter,
  X,
  MoreVertical,
  Trash2,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getConversations, getMessages, sendMessage, markMessagesAsRead, getOrCreateConversation, acceptCounterOffer, declineCounterOffer } from "@/app/actions/messages"
import { getSubscriptionBadge as getSubBadge } from "@/lib/subscription-utils"
import type { ConversationWithLatestMessage, MessageData } from "@/app/actions/messages"
import {
  getTransactionById,
  getTransactionByPeers,
  toggleTransactionConfirmation,
  submitVouch,
  cancelTransaction,
} from "@/app/actions/transactions"
import type { TransactionData } from "@/app/actions/transactions"
import { createReport } from "@/app/actions/admin"
import { useToast } from "@/hooks/use-toast"

type Contact = {
  id: string
  otherUserId: string
  name: string
  lastMessage: string
  timestamp: string
  online: boolean
  role: "seller" | "buyer"
  status: "ongoing" | "completed" | "sold" | "cancelled"
  blocked: boolean
  unreadCount: number
  subscriptionTier?: string
  item: {
    id: string
    title: string
    price: number
    image: string
  }
  transactionStatus: {
    buyerConfirmed: boolean
    sellerConfirmed: boolean
    buyerVouched: boolean
    sellerVouched: boolean
  }
  transaction?: {
    id: string
    price: number
    amount: number | null
    status: string
    buyerConfirmed: boolean
    sellerConfirmed: boolean
  } | null
  _sortDate?: Date | string
}

type Message = {
  id: string
  sender: "buyer" | "seller"
  text: string
  timestamp: string
  createdAt: Date
  type?: "text" | "counteroffer" | "image"
  offerAmount?: number
  offerStatus?: "pending" | "accepted" | "rejected" | "declined"
  imageUrl?: string
}

const getStatusBadge = (status: "ongoing" | "completed" | "sold" | "cancelled") => {
  switch (status) {
    case "ongoing":
      return { label: "Ongoing", className: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30" }
    case "completed":
      return { label: "Completed", className: "bg-green-500/20 text-green-600 border-green-500/30" }
    case "sold":
      return { label: "Sold", className: "bg-red-500/20 text-red-600 border-red-500/30" }
    case "cancelled":
      return { label: "Cancelled", className: "bg-red-500/20 text-red-600 border-red-500/30" }
  }
}

const formatContactTimestamp = (date: Date | string) => {
  const messageDate = new Date(date)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  // Check if message is from today
  if (messageDate.toDateString() === today.toDateString()) {
    return messageDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }
  // Check if message is from yesterday
  else if (messageDate.toDateString() === yesterday.toDateString()) {
    return "Yesterday"
  }
  // Check if message is from this week
  else {
    const daysDiff = Math.floor((today.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff < 7) {
      return messageDate.toLocaleDateString([], { weekday: 'short' })
    }
    // Older messages show date
    return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }
}

const reportReasons = [
  "Scammer / Fraud",
  "Inappropriate behavior",
  "Fake item / Misleading listing",
  "Did not deliver",
  "Harassment",
  "Other",
]

export default function MessagesPage() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [transaction, setTransaction] = useState<TransactionData | null>(null)
  const [messageText, setMessageText] = useState("")
  const [showVouchModal, setShowVouchModal] = useState(false)
  const [vouchMessage, setVouchMessage] = useState("")
  const [vouchRating, setVouchRating] = useState(5)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState("")
  const [reportDetails, setReportDetails] = useState("")
  const [reportLoading, setReportLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [showCounterOfferInput, setShowCounterOfferInput] = useState(false)
  const [counterOfferAmount, setCounterOfferAmount] = useState("")
  const [contactSearch, setContactSearch] = useState("")
  const [conversationSearch, setConversationSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "ongoing" | "completed" | "sold">("all")
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [attachedImages, setAttachedImages] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showSearchBar, setShowSearchBar] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [vouchSubmitting, setVouchSubmitting] = useState(false)
  const [amountQueryParam, setAmountQueryParam] = useState<number | null>(null)

  useEffect(() => {
    if (isAuthLoading) return
    if (!user) {
      router.push("/auth/login")
    }
  }, [user, isAuthLoading, router])

  // Read amount query parameter from URL
  useEffect(() => {
    const amount = searchParams.get("amount")
    if (amount) {
      setAmountQueryParam(parseInt(amount, 10))
    }
  }, [searchParams])

  // Load conversations on mount
  useEffect(() => {
    if (!user || isAuthLoading) return

    const loadConversations = async () => {
      setLoadingConversations(true)
      try {
        // Auto-open conversation BEFORE loading list if sellerId is in searchParams
        const sellerId = searchParams.get("sellerId")
        const itemId = searchParams.get("itemId")
        const listingType = searchParams.get("type") === "currency" ? "CURRENCY" : "ITEM"

        if (sellerId) {
          try {
            // Try to read transaction details from URL: `amount` and `cost`
            const amountParam = searchParams.get("amount")
            const costParam = searchParams.get("cost")
            let txDetails: { price: number; amount: number } | undefined = undefined

            if (amountParam && costParam) {
              const parsedAmount = parseInt(amountParam, 10)
              const parsedCost = parseInt(costParam, 10)
              if (!isNaN(parsedAmount) && !isNaN(parsedCost)) {
                txDetails = { price: parsedCost, amount: parsedAmount }
              }
            }

            const convResult = await getOrCreateConversation(sellerId, itemId || undefined, txDetails, listingType)
            
            // Send automatic interest message if conversation was created successfully
            if (convResult.success && convResult.conversationId) {
              // Check if this is a new conversation by checking if it has any messages
              const messagesResult = await getMessages(convResult.conversationId)
              
              if (messagesResult.success && messagesResult.messages && messagesResult.messages.length === 0) {
                // No messages yet, send the automatic interest message
                const itemName = itemId ? "this item" : "your listing"
                await sendMessage(`Hi! I'm interested in ${itemName}.`, {
                  conversationId: convResult.conversationId,
                })
              }
            }
          } catch (error) {
            console.error("Error auto-opening conversation:", error)
          }
        }

        // Now load all conversations (including the newly created one)
        const result = await getConversations()
        if (result.success && result.conversations) {
          // Load transactions for all conversations to get accurate status
          const convertedContacts: Contact[] = await Promise.all(
            result.conversations.map(async (conv) => {
              let transactionData = {
                buyerConfirmed: false,
                sellerConfirmed: false,
                buyerVouched: false,
                sellerVouched: false,
              }
              
              // Use conversation-specific transaction data if available
              let contactStatus: "ongoing" | "completed" | "sold" | "cancelled" = "ongoing"
              if ((conv as any).transaction) {
                const tx = (conv as any).transaction
                transactionData = {
                  buyerConfirmed: tx.buyerConfirmed || false,
                  sellerConfirmed: tx.sellerConfirmed || false,
                  buyerVouched: false, // Would need additional query
                  sellerVouched: false, // Would need additional query
                }
                // Set status based on actual transaction status
                if (tx.status === "COMPLETED") {
                  contactStatus = "completed"
                } else if (tx.status === "CANCELLED") {
                  contactStatus = "cancelled"
                } else {
                  contactStatus = "ongoing"
                }
              }
              
              return {
                id: conv.id,
                otherUserId: conv.otherUser.id,
                name: conv.otherUser.username,
                subscriptionTier: (conv.otherUser as any).subscriptionTier,
                lastMessage: conv.latestMessage?.attachmentUrl 
                  ? "Sent a photo." 
                  : (conv.latestMessage?.content || "No messages yet"),
                timestamp: conv.latestMessage
                  ? formatContactTimestamp(conv.latestMessage.createdAt)
                  : "",
                online: false,
                role: conv.buyerId === user.id ? "seller" : "buyer",
                status: contactStatus,
                blocked: false,
                unreadCount: (conv as any).unreadCount || 0,
                item: conv.listing || {
                  id: "unknown",
                  title: "Unknown Item",
                  price: 0,
                  image: "/placeholder.svg",
                },
                transactionStatus: transactionData,
                transaction: (conv as any).transaction || null,
                _sortDate: conv.latestMessage?.createdAt || conv.createdAt,
              }
            })
          )
          // Sort contacts by most recent message first
          convertedContacts.sort((a, b) => {
            const dateA = new Date(a._sortDate).getTime()
            const dateB = new Date(b._sortDate).getTime()
            return dateB - dateA
          })
          setContacts(convertedContacts)

          // Select the conversation that was just created
          if (sellerId) {
            const targetContact = convertedContacts.find((c) => {
              return c.otherUserId === sellerId && (itemId ? c.item.id === itemId : true)
            })

            if (targetContact) {
              handleSelectContact(targetContact)
            }
          }
        }
      } catch (error) {
        console.error("Error loading conversations:", error)
        toast({
          title: "Error",
          description: "Failed to load conversations. Please refresh the page.",
          variant: "destructive",
        })
      } finally {
        setLoadingConversations(false)
      }
    }

    loadConversations()
  }, [user, isAuthLoading, searchParams])

  // Load messages when contact is selected
  useEffect(() => {
    if (!selectedContact || !selectedConversationId) return

    const loadMessages = async () => {
      setLoadingMessages(true)
      try {
        const result = await getMessages(selectedConversationId)
        if (result.success && result.messages) {
          // Mark messages as read
          await markMessagesAsRead(selectedConversationId)

          // Update the contact's unreadCount to 0 in the local state
          setContacts((prev) =>
            prev.map((contact) =>
              contact.id === selectedConversationId
                ? { ...contact, unreadCount: 0 }
                : contact
            )
          )

          // Also update selectedContact to remove the highlight
          setSelectedContact((prev) =>
            prev ? { ...prev, unreadCount: 0 } : null
          )

          const convertedMessages: Message[] = result.messages.map((msg) => {
            // Check if message is a counteroffer (has offerAmount)
            const isCounteroffer = (msg as any).offerAmount !== null && (msg as any).offerAmount !== undefined
            
            return {
              id: msg.id,
              sender: msg.senderId === user?.id ? "buyer" : "seller",
              text: msg.content,
              timestamp: new Date(msg.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              createdAt: new Date(msg.createdAt),
              type: isCounteroffer ? "counteroffer" : msg.attachmentUrl ? "image" : ("text" as const),
              imageUrl: msg.attachmentUrl || undefined,
              offerAmount: isCounteroffer ? (msg as any).offerAmount : undefined,
              offerStatus: isCounteroffer ? ((msg as any).offerStatus || "pending") : undefined,
            }
          })
          setMessages(convertedMessages)
        }
      } catch (error) {
        console.error("Error loading messages:", error)
        toast({
          title: "Error",
          description: "Failed to load messages. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoadingMessages(false)
      }
    }

    loadMessages()
  }, [selectedConversationId, user?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  if (isAuthLoading || !user) {
    return (
      <>
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[700px]">
            <div className="md:col-span-1 border rounded-lg bg-card overflow-hidden flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground mt-4">Loading...</p>
            </div>
            <div className="md:col-span-2 border rounded-lg bg-card overflow-hidden flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground mt-4">Loading...</p>
            </div>
          </div>
        </main>
      </>
    )
  }

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contactSearch === "" ||
      contact.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
      contact.item.title.toLowerCase().includes(contactSearch.toLowerCase())
    const matchesStatus = statusFilter === "all" || contact.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const filteredMessages = messages.filter((msg) => {
    if (conversationSearch === "") return true
    return msg.text.toLowerCase().includes(conversationSearch.toLowerCase())
  })

  const handleSendMessage = async () => {
    if (!selectedConversationId || (!messageText.trim() && attachedImages.length === 0)) return

    setSendingMessage(true)
    try {
      let messageResult: any = null

      // Send attached images first
      for (const imgUrl of attachedImages) {
        const result = await sendMessage(imgUrl, {
          conversationId: selectedConversationId,
          attachmentUrl: imgUrl,
        })
        if (!result.success) {
          console.error("Error sending image:", result.error)
          toast({
            title: "Error",
            description: result.error || "Failed to send image.",
            variant: "destructive",
          })
        } else {
          messageResult = result // Track the last result
          // Add optimistic image message update
          const newImageMessage: Message = {
            id: result.messageId || `temp-img-${Date.now()}`,
            sender: "buyer",
            text: imgUrl,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            createdAt: new Date(),
            type: "image",
            imageUrl: imgUrl,
          }
          setMessages((prev) => [...prev, newImageMessage])
        }
      }

      // Then send text message if any
      if (messageText.trim()) {
        const result = await sendMessage(messageText, {
          conversationId: selectedConversationId,
          amount: amountQueryParam || undefined,
        })
        if (!result.success) {
          console.error("Error sending message:", result.error)
          toast({
            title: "Error",
            description: result.error || "Failed to send message.",
            variant: "destructive",
          })
          return
        }

        messageResult = result // Track the text message result

        // Add optimistic message update
        const newMessage: Message = {
          id: `temp-${Date.now()}`,
          sender: "buyer",
          text: messageText,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          createdAt: new Date(),
          type: "text",
        }
        setMessages((prev) => [...prev, newMessage])
        
        // Clear amount query param after first message
        setAmountQueryParam(null)
      }

      // If transaction was just created or transaction state is null, load it immediately
      if (messageResult?.transactionCreated || !transaction) {
        console.log("🔄 Loading transaction after message send...")
        
        // Use getTransactionByPeers to get the transaction with proper userVouched flag
        if (selectedContact?.item.id && selectedContact?.item.id !== "unknown" && selectedContact?.otherUserId) {
          const transactionResult = await getTransactionByPeers(
            selectedContact.item.id,
            selectedContact.otherUserId
          )
          if (transactionResult.success && transactionResult.transaction) {
            setTransaction(transactionResult.transaction)
            console.log("✅ Transaction loaded after message:", transactionResult.transaction)
          }
        } else {
          // Fallback: Try to get transaction with proper userVouched from conversation data
          const conversationsResult = await getConversations()
          if (conversationsResult.success && conversationsResult.conversations && selectedConversationId) {
            const updatedConv = conversationsResult.conversations.find(c => c.id === selectedConversationId)
            if (updatedConv && (updatedConv as any).transaction && updatedConv.listing?.id) {
              // Try getTransactionByPeers with conversation listing ID
              const otherUserId = updatedConv.buyerId === user.id ? updatedConv.sellerId : updatedConv.buyerId
              const txResult = await getTransactionByPeers(updatedConv.listing.id, otherUserId)
              
              if (txResult.success && txResult.transaction) {
                setTransaction(txResult.transaction)
                console.log("✅ Transaction loaded after message (fallback with proper vouch):", txResult.transaction)
              } else {
                // Last resort: use conversation data without userVouched
                const tx = (updatedConv as any).transaction
                const fullTransaction: TransactionData = {
                  id: tx.id,
                  buyerId: updatedConv.buyerId,
                  sellerId: updatedConv.sellerId,
                  buyer: {
                    id: updatedConv.buyerId,
                    username: updatedConv.buyerId === user.id ? user.username || "You" : selectedContact?.name || "Buyer",
                  },
                  seller: {
                    id: updatedConv.sellerId,
                    username: updatedConv.sellerId === user.id ? user.username || "You" : selectedContact?.name || "Seller",
                  },
                  listing: updatedConv.listing || selectedContact?.item || { id: "", title: "", price: 0, image: "" },
                  price: tx.price,
                  amount: tx.amount,
                  status: tx.status,
                  buyerConfirmed: tx.buyerConfirmed,
                  sellerConfirmed: tx.sellerConfirmed,
                  userVouched: false, // Unable to determine - last resort fallback
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }
                setTransaction(fullTransaction)
                console.log("✅ Transaction loaded after message (last resort fallback):", fullTransaction)
              }
            }
          }
        }
      }

      // Update contacts list after sending message
      if (selectedConversationId && selectedContact) {
        const newTimestamp = new Date()
        const lastMessageText = messageText.trim() || (attachedImages.length > 0 ? "Sent a photo." : "")
        
        // Update the current contact in the list with new last message and timestamp
        setContacts((prev) => {
          const updated = prev.map((contact) => {
            if (contact.id === selectedConversationId) {
              return {
                ...contact,
                lastMessage: lastMessageText,
                timestamp: formatContactTimestamp(newTimestamp),
                _sortDate: newTimestamp,
              }
            }
            return contact
          })
          
          // Re-sort to move updated conversation to top
          updated.sort((a, b) => {
            const dateA = new Date(a._sortDate || a.timestamp).getTime()
            const dateB = new Date(b._sortDate || b.timestamp).getTime()
            return dateB - dateA
          })
          
          return updated
        })

        // Also update selectedContact to reflect new message
        setSelectedContact((prev) => {
          if (!prev || prev.id !== selectedConversationId) return prev
          return {
            ...prev,
            lastMessage: lastMessageText,
            timestamp: formatContactTimestamp(newTimestamp),
            _sortDate: newTimestamp,
          }
        })
      }

      // If new conversation was created, refresh contacts list
      if (messageResult?.conversationId && messageResult.conversationId !== selectedConversationId) {
        console.log("🔄 New conversation created, refreshing contacts...")
        const conversationsResult = await getConversations()
        if (conversationsResult.success && conversationsResult.conversations) {
          // Load transactions for all conversations to get accurate status
          const convertedContacts: Contact[] = await Promise.all(
            conversationsResult.conversations.map(async (conv) => {
              let transactionData = {
                buyerConfirmed: false,
                sellerConfirmed: false,
                buyerVouched: false,
                sellerVouched: false,
              }
              
              // Use conversation-specific transaction data if available
              let contactStatus: "ongoing" | "completed" | "sold" | "cancelled" = "ongoing"
              if ((conv as any).transaction) {
                const tx = (conv as any).transaction
                transactionData = {
                  buyerConfirmed: tx.buyerConfirmed || false,
                  sellerConfirmed: tx.sellerConfirmed || false,
                  buyerVouched: false, // Would need additional query
                  sellerVouched: false, // Would need additional query
                }
                // Set status based on actual transaction status
                if (tx.status === "COMPLETED") {
                  contactStatus = "completed"
                } else if (tx.status === "CANCELLED") {
                  contactStatus = "cancelled"
                } else {
                  contactStatus = "ongoing"
                }
              }
              
              return {
                id: conv.id,
                otherUserId: conv.otherUser.id,
                name: conv.otherUser.username,
                subscriptionTier: (conv.otherUser as any).subscriptionTier,
                lastMessage: conv.latestMessage?.attachmentUrl 
                  ? "Sent a photo." 
                  : (conv.latestMessage?.content || "No messages yet"),
                timestamp: conv.latestMessage
                  ? formatContactTimestamp(conv.latestMessage.createdAt)
                  : "",
                online: false,
                role: conv.buyerId === user?.id ? "seller" : "buyer",
                status: contactStatus,
                blocked: false,
                unreadCount: (conv as any).unreadCount || 0,
                item: conv.listing || {
                  id: "unknown",
                  title: "Unknown Item",
                  price: 0,
                  image: "/placeholder.svg",
                },
                transactionStatus: transactionData,
                transaction: (conv as any).transaction || null,
                _sortDate: conv.latestMessage?.createdAt || conv.createdAt,
              }
            })
          )
          // Sort contacts by most recent message first
          convertedContacts.sort((a, b) => {
            const dateA = new Date(a._sortDate).getTime()
            const dateB = new Date(b._sortDate).getTime()
            return dateB - dateA
          })
          setContacts(convertedContacts)
        }
      }

      setMessageText("")
      setAttachedImages([])
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSendingMessage(false)
    }
  }

  const handleSendCounterOffer = async () => {
    const amount = Number(counterOfferAmount)
    if (!amount || amount <= 0 || !selectedConversationId) return

    setSendingMessage(true)
    try {
      // Send counteroffer as a message with offerAmount
      const result = await sendMessage("I'd like to make a counteroffer", {
        conversationId: selectedConversationId,
        offerAmount: amount,
      })

      if (!result.success) {
        console.error("Error sending counteroffer:", result.error)
        toast({
          title: "Error",
          description: result.error || "Failed to send counteroffer.",
          variant: "destructive",
        })
        return
      }

      // Add optimistic message update
      const newMessage: Message = {
        id: result.messageId || `counteroffer-${Date.now()}`,
        sender: "buyer",
        text: `I'd like to make a counteroffer`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        createdAt: new Date(),
        type: "counteroffer",
        offerAmount: amount,
        offerStatus: "pending",
      }
      setMessages((prev) => [...prev, newMessage])
      setCounterOfferAmount("")
      setShowCounterOfferInput(false)
    } catch (error) {
      console.error("Error sending counteroffer:", error)
      toast({
        title: "Error",
        description: "Failed to send counteroffer. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSendingMessage(false)
    }
  }

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      Array.from(files).forEach((file) => {
        if (file.type.startsWith("image/")) {
          const reader = new FileReader()
          reader.onload = (event) => {
            if (event.target?.result) {
              setAttachedImages((prev) => [...prev, event.target!.result as string])
            }
          }
          reader.readAsDataURL(file)
        }
      })
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleBlockUser = () => {
    if (!selectedContact) return

    setContacts((prev) =>
      prev.map((contact) => {
        if (contact.id === selectedContact.id) {
          return { ...contact, blocked: !contact.blocked }
        }
        return contact
      }),
    )

    setSelectedContact((prev) => {
      if (!prev) return null
      return { ...prev, blocked: !prev.blocked }
    })

    setShowBlockModal(false)
  }

  const handleMarkComplete = async () => {
    if (!transaction) return

    try {
      const result = await toggleTransactionConfirmation(transaction.id)

      if (result.success && result.transaction) {
        // Update transaction state
        setTransaction(result.transaction)

        // Update contact status based on new transaction status
        if (result.transaction.status === "COMPLETED") {
          setContacts((prev) =>
            prev.map((contact) => {
              if (contact.id === selectedContact?.id) {
                return { ...contact, status: "completed" as const }
              }
              return contact
            })
          )
          setSelectedContact((prev) => {
            if (!prev) return null
            return { ...prev, status: "completed" as const }
          })
        }
      } else {
        console.error("Error marking complete:", result.error)
        toast({
          title: "Error",
          description: result.error || "Failed to confirm transaction.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error marking complete:", error)
      toast({
        title: "Error",
        description: "Failed to confirm transaction. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleCancelTransaction = async () => {
    if (!transaction) return

    try {
      const result = await cancelTransaction(transaction.id)

      if (result.success) {
        // Update transaction state
        setTransaction((prev) => prev ? { ...prev, status: "CANCELLED" } : null)

        // Update contact's transaction status and contact status
        setContacts((prev) =>
          prev.map((contact) => {
            if (contact.id === selectedContact?.id) {
              return { 
                ...contact,
                status: "cancelled" as const,
                transaction: contact.transaction ? { 
                  ...contact.transaction, 
                  status: "CANCELLED" 
                } : contact.transaction
              }
            }
            return contact
          })
        )
        setSelectedContact((prev) => {
          if (!prev) return null
          return { 
            ...prev,
            status: "cancelled" as const,
            transaction: prev.transaction ? { 
              ...prev.transaction, 
              status: "CANCELLED" 
            } : prev.transaction
          }
        })

        toast({
          title: "Transaction Cancelled",
          description: "The transaction has been cancelled.",
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to cancel transaction.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error cancelling transaction:", error)
      toast({
        title: "Error",
        description: "Failed to cancel transaction. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSubmitVouch = async () => {
    if (!selectedContact || !transaction) return

    setVouchSubmitting(true)
    try {
      const result = await submitVouch(transaction.id, vouchRating, vouchMessage)

      if (result.success) {
        // Update transaction status
        const updatedResult = await getTransactionById(transaction.id)
        if (updatedResult.success && updatedResult.transaction) {
          setTransaction(updatedResult.transaction)
        }

        setShowVouchModal(false)
        setVouchMessage("")
        setVouchRating(5)
      } else {
        console.error("Error submitting vouch:", result.error)
        toast({
          title: "Error",
          description: result.error || "Failed to submit vouch.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error submitting vouch:", error)
      toast({
        title: "Error",
        description: "Failed to submit vouch. Please try again.",
        variant: "destructive",
      })
    } finally {
      setVouchSubmitting(false)
    }
  }

  const handleSubmitReport = async () => {
    if (!selectedContact || !reportReason) {
      toast({
        title: "Error",
        description: "Please select a reason for reporting",
        variant: "destructive",
      })
      return
    }

    try {
      setReportLoading(true)
      const result = await createReport({
        reportedUserId: selectedContact.otherUserId,
        reason: reportReason,
        details: reportDetails || undefined,
      })

      if (result.success) {
        toast({
          title: "Success",
          description: "Report submitted successfully. Our team will review it.",
        })
        setShowReportModal(false)
        setReportReason("")
        setReportDetails("")
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to submit report",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Failed to submit report:", err)
      toast({
        title: "Error",
        description: "An error occurred while submitting the report",
        variant: "destructive",
      })
    } finally {
      setReportLoading(false)
    }
  }

  const handleDeleteChat = () => {
    if (!selectedContact) return
    setContacts((prev) => prev.filter((contact) => contact.id !== selectedContact.id))
    setSelectedContact(null)
    setMessages([])
    setShowDeleteModal(false)
  }

  const handleAcceptCounterOffer = async (messageId: string) => {
    try {
      const result = await acceptCounterOffer(messageId)
      if (result.success) {
        // Reload messages to show acceptance status
        if (selectedConversationId) {
          const messagesResult = await getMessages(selectedConversationId)
          if (messagesResult.success && messagesResult.messages) {
            const convertedMessages: Message[] = messagesResult.messages.map((msg) => {
              const isSender = msg.senderId === user?.id
              return {
                id: msg.id,
                sender: isSender ? "buyer" : "seller",
                text: msg.content,
                timestamp: new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                type: msg.offerAmount ? "counteroffer" : msg.attachmentUrl ? "image" : "text",
                offerAmount: msg.offerAmount || undefined,
                imageUrl: msg.attachmentUrl || undefined,
                offerStatus: "accepted" as const,
              }
            })
            setMessages(convertedMessages)
          }
        }
        // Also reload transaction to reflect new price
        if (selectedContact?.item.id && selectedContact?.item.id !== "unknown") {
          const transactionResult = await getTransactionByPeers(
            selectedContact.item.id,
            selectedContact.otherUserId
          )
          if (transactionResult.success && transactionResult.transaction) {
            setTransaction(transactionResult.transaction)
          }
        }
        alert("Counteroffer accepted successfully!")
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to accept counteroffer.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error accepting counteroffer:", error)
      toast({
        title: "Error",
        description: "Failed to accept counteroffer. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeclineCounterOffer = async (messageId: string) => {
    try {
      const result = await declineCounterOffer(messageId)
      if (result.success) {
        // Reload messages to show decline status
        if (selectedConversationId) {
          const messagesResult = await getMessages(selectedConversationId)
          if (messagesResult.success && messagesResult.messages) {
            const convertedMessages: Message[] = messagesResult.messages.map((msg) => {
              const isSender = msg.senderId === user?.id
              return {
                id: msg.id,
                sender: isSender ? "buyer" : "seller",
                text: msg.content,
                timestamp: new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                type: msg.offerAmount ? "counteroffer" : msg.attachmentUrl ? "image" : "text",
                offerAmount: msg.offerAmount || undefined,
                imageUrl: msg.attachmentUrl || undefined,
                offerStatus: "declined" as const,
              }
            })
            setMessages(convertedMessages)
          }
        }
        alert("Counteroffer declined")
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to decline counteroffer.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error declining counteroffer:", error)
      toast({
        title: "Error",
        description: "Failed to decline counteroffer. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSelectContact = async (contact: Contact) => {
    setSelectedContact(contact)
    setSelectedConversationId(contact.id)
    setShowCounterOfferInput(false)
    setConversationSearch("")
    setMessages([])
    
    // Load transaction with proper confirmation states and userVouched flag
    if (contact.item.id && contact.item.id !== "unknown") {
      const transactionResult = await getTransactionByPeers(
        contact.item.id,
        contact.otherUserId
      )
      if (transactionResult.success && transactionResult.transaction) {
        setTransaction(transactionResult.transaction)
      } else {
        // Fallback to contact transaction data if getTransactionByPeers fails
        if (contact.transaction) {
          const fullTransaction: TransactionData = {
            id: contact.transaction.id,
            buyerId: contact.role === "buyer" ? user.id : contact.otherUserId,
            sellerId: contact.role === "seller" ? user.id : contact.otherUserId,
            buyer: {
              id: contact.role === "buyer" ? user.id : contact.otherUserId,
              username: contact.role === "buyer" ? user.username || "You" : contact.name,
            },
            seller: {
              id: contact.role === "seller" ? user.id : contact.otherUserId,
              username: contact.role === "seller" ? user.username || "You" : contact.name,
            },
            listing: {
              id: contact.item.id,
              title: contact.item.title,
              price: contact.item.price,
              image: contact.item.image,
            },
            price: contact.transaction.price,
            amount: contact.transaction.amount ?? undefined,
            status: contact.transaction.status as "PENDING" | "COMPLETED" | "CANCELLED",
            buyerConfirmed: contact.transaction.buyerConfirmed,
            sellerConfirmed: contact.transaction.sellerConfirmed,
            userVouched: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
          setTransaction(fullTransaction)
        } else {
          setTransaction(null)
        }
      }
    } else if (contact.transaction) {
      // No listing ID, use contact transaction data
      const fullTransaction: TransactionData = {
        id: contact.transaction.id,
        buyerId: contact.role === "buyer" ? user.id : contact.otherUserId,
        sellerId: contact.role === "seller" ? user.id : contact.otherUserId,
        buyer: {
          id: contact.role === "buyer" ? user.id : contact.otherUserId,
          username: contact.role === "buyer" ? user.username || "You" : contact.name,
        },
        seller: {
          id: contact.role === "seller" ? user.id : contact.otherUserId,
          username: contact.role === "seller" ? user.username || "You" : contact.name,
        },
        listing: {
          id: contact.item.id,
          title: contact.item.title,
          price: contact.item.price,
          image: contact.item.image,
        },
        price: contact.transaction.price,
        amount: contact.transaction.amount ?? undefined,
        status: contact.transaction.status as "PENDING" | "COMPLETED" | "CANCELLED",
        buyerConfirmed: contact.transaction.buyerConfirmed,
        sellerConfirmed: contact.transaction.sellerConfirmed,
        userVouched: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setTransaction(fullTransaction)
    } else {
      setTransaction(null)
    }
  }

  const canMarkComplete = selectedContact
    ? selectedContact.role === "seller"
      ? !selectedContact.transactionStatus.sellerConfirmed
      : !selectedContact.transactionStatus.buyerConfirmed
    : false

  const hasUserConfirmed = selectedContact
    ? selectedContact.role === "seller"
      ? selectedContact.transactionStatus.sellerConfirmed
      : selectedContact.transactionStatus.buyerConfirmed
    : false

  const bothConfirmed = selectedContact
    ? selectedContact.transactionStatus.buyerConfirmed && selectedContact.transactionStatus.sellerConfirmed
    : false

  const canVouch = selectedContact
    ? bothConfirmed &&
      (selectedContact.role === "seller"
        ? !selectedContact.transactionStatus.buyerVouched
        : !selectedContact.transactionStatus.sellerVouched)
    : false

  const hasVouched = selectedContact
    ? selectedContact.role === "seller"
      ? selectedContact.transactionStatus.buyerVouched
      : selectedContact.transactionStatus.sellerVouched
    : false

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[700px]">
          {/* Contacts List */}
          <div className="md:col-span-1 border rounded-lg bg-card overflow-hidden flex flex-col">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-lg mb-3">Recent Contacts</h2>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between bg-transparent">
                    <span className="flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      {statusFilter === "all"
                        ? "All Status"
                        : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 bg-background/95 backdrop-blur-sm">
                  <DropdownMenuItem onClick={() => setStatusFilter("all")}>All Status</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("ongoing")}>Ongoing</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("completed")}>Completed</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("sold")}>Sold</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("cancelled")}>Cancelled</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingConversations ? (
                <div className="p-4 text-center text-muted-foreground flex items-center justify-center h-full">
                  <div>
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <p>Loading conversations...</p>
                  </div>
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <p>No contacts found</p>
                </div>
              ) : (
                filteredContacts.map((contact) => {
                  const statusBadge = getStatusBadge(contact.status)
                  const hasUnread = contact.unreadCount > 0
                  return (
                    <button
                      key={contact.id}
                      onClick={() => handleSelectContact(contact)}
                      className={`w-full p-4 border-b text-left hover:bg-muted transition ${
                        selectedContact?.id === contact.id ? "bg-muted border-l-2 border-l-primary" : ""
                      } ${contact.blocked ? "opacity-50" : ""} ${
                        hasUnread ? "bg-primary/5 border-l-2 border-l-primary" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={contact.item.image || "/placeholder.svg"}
                          alt={contact.item.title}
                          className="w-10 h-10 rounded object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium truncate flex items-center gap-2">
                              {contact.name}
                              {contact.blocked && <Ban className="w-3 h-3 text-red-500" />}
                              {contact.unreadCount > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 bg-primary text-primary-foreground text-xs rounded-full font-bold">
                                  {contact.unreadCount}
                                </span>
                              )}
                            </p>
                            {contact.online && !contact.blocked && (
                              <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{contact.item.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={`text-xs ${statusBadge.className}`}>
                              {statusBadge.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-1">{contact.lastMessage}</p>
                          <p className="text-xs text-muted-foreground mt-1">{contact.timestamp}</p>
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="md:col-span-2 border rounded-lg bg-card flex flex-col h-[700px]">
            {selectedContact ? (
              <>
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold flex items-center gap-2">
                        <Link href={`/profile/${selectedContact.otherUserId}`} className="hover:underline">
                          {selectedContact.name}
                        </Link>
                        {selectedContact.blocked && (
                          <Badge variant="destructive" className="text-xs">
                            Blocked
                          </Badge>
                        )}
                        {selectedContact.subscriptionTier && getSubBadge(selectedContact.subscriptionTier) && (
                          <Badge 
                            variant={getSubBadge(selectedContact.subscriptionTier)!.variant} 
                            className={`text-xs ${getSubBadge(selectedContact.subscriptionTier)!.className}`}
                          >
                            {getSubBadge(selectedContact.subscriptionTier)!.label}
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedContact.blocked ? "Blocked" : selectedContact.online ? "Online" : "Offline"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Expandable Search */}
                    {showSearchBar ? (
                      <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
                        <Input
                          placeholder="Search messages..."
                          value={conversationSearch}
                          onChange={(e) => setConversationSearch(e.target.value)}
                          className="h-8 w-48 text-sm"
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setShowSearchBar(false)
                            setConversationSearch("")
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setShowSearchBar(true)}
                        title="Search conversation"
                      >
                        <Search className="w-4 h-4" />
                      </Button>
                    )}
                    {/* Kebab Menu with Block, Report, Delete */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setShowBlockModal(true)}
                          className={selectedContact.blocked ? "text-green-600" : "text-orange-600"}
                        >
                          <Ban className="w-4 h-4 mr-2" />
                          {selectedContact.blocked ? "Unblock User" : "Block User"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowReportModal(true)} className="text-red-600">
                          <Flag className="w-4 h-4 mr-2" />
                          Report User
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setShowDeleteModal(true)} className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Chat
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Item Info Bar */}
                <div className="px-4 py-3 border-b bg-muted/50">
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedContact.item.image || "/placeholder.svg"}
                      alt={selectedContact.item.title}
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {selectedContact.role === "seller" ? "Buying from" : "Selling to"} {selectedContact.name}
                        </span>
                      </div>
                      <p className="font-semibold truncate">{selectedContact.item.title}</p>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-primary font-bold">
                          PHP {(transaction?.price ?? selectedContact.item.price).toLocaleString()}
                        </p>
                        {transaction?.amount && (
                          <p className="text-xs text-muted-foreground">
                            Quantity: {transaction.amount.toLocaleString()} units
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowCounterOfferInput(!showCounterOfferInput)}
                      title="Make a counteroffer"
                      disabled={selectedContact.blocked || selectedContact.status === "completed" || selectedContact.status === "sold" || selectedContact.status === "cancelled"}
                      className="h-10 w-10"
                    >
                      <DollarSign className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                {/* Transaction Status Bar */}
                <div className="px-4 py-3 border-b bg-secondary/30">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {transaction ? (
                      <>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <CheckCircle
                              className={`w-4 h-4 ${transaction.buyerConfirmed ? "text-green-500" : "text-muted-foreground"}`}
                            />
                            <span
                              className={
                                transaction.buyerConfirmed
                                  ? "text-green-600"
                                  : "text-muted-foreground"
                              }
                            >
                              {user?.id === transaction.buyerId && transaction.buyerConfirmed
                                ? "You have confirmed"
                                : transaction.buyerConfirmed
                                  ? "Buyer confirmed"
                                  : "Buyer pending"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle
                              className={`w-4 h-4 ${transaction.sellerConfirmed ? "text-green-500" : "text-muted-foreground"}`}
                            />
                            <span
                              className={
                                transaction.sellerConfirmed
                                  ? "text-green-600"
                                  : "text-muted-foreground"
                              }
                            >
                              {user?.id === transaction.sellerId && transaction.sellerConfirmed
                                ? "You have confirmed"
                                : transaction.sellerConfirmed
                                  ? "Seller confirmed"
                                  : "Seller pending"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {transaction.status === "COMPLETED" ? (
                            <>
                              {transaction.userVouched ? (
                                <Badge variant="outline" className="bg-green-500/20 text-green-600">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Vouched
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setShowVouchModal(true)}
                                >
                                  <Star className="w-4 h-4 mr-2" />
                                  Vouch for {selectedContact?.name}
                                </Button>
                              )}
                            </>
                          ) : transaction.status === "PENDING" ? (
                            <>
                              {(() => {
                                const isBuyer = user?.id === transaction.buyerId
                                const isConfirmed = isBuyer
                                  ? transaction.buyerConfirmed
                                  : transaction.sellerConfirmed

                                if (!isConfirmed) {
                                  return (
                                    <Button size="sm" onClick={handleMarkComplete}>
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Mark as Complete
                                    </Button>
                                  )
                                } else {
                                  return (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={handleMarkComplete}
                                    >
                                      <X className="w-4 h-4 mr-2" />
                                      Cancel Confirmation
                                    </Button>
                                  )
                                }
                              })()}
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={handleCancelTransaction}
                              >
                                <Ban className="w-4 h-4 mr-2" />
                                Cancel Transaction
                              </Button>
                            </>
                          ) : transaction.status === "CANCELLED" ? (
                            <span className="text-sm text-red-500 flex items-center gap-1">
                              <AlertTriangle className="w-4 h-4" />
                              Transaction cancelled
                            </span>
                          ) : null}
                        </div>
                      </>
                    ) : selectedContact.status === "sold" ? (
                      <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-500/10 px-3 py-2 rounded-lg">
                        <AlertTriangle className="w-4 h-4" />
                        Item sold to another user
                      </div>
                    ) : selectedContact.status === "cancelled" ? (
                      <div className="flex items-center gap-2 text-sm text-red-600 bg-red-500/10 px-3 py-2 rounded-lg">
                        <Ban className="w-4 h-4" />
                        Transaction cancelled
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">No active transaction</span>
                    )}
                  </div>
                </div>

                <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 chat-scrollbar">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-muted-foreground">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        <p>Loading messages...</p>
                      </div>
                    </div>
                  ) : selectedContact.blocked ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Ban className="w-12 h-12 mx-auto mb-2 opacity-50 text-red-500" />
                        <p>You have blocked this user</p>
                        <p className="text-sm">Unblock to continue the conversation</p>
                      </div>
                    </div>
                  ) : filteredMessages.length === 0 && conversationSearch ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <p>No messages match your search</p>
                    </div>
                  ) : (
                    <>
                      {filteredMessages.map((msg, index) => {
                        // Check if we need to show a date separator
                        const showDateSeparator = index === 0 || 
                          new Date(filteredMessages[index - 1].createdAt).toDateString() !== new Date(msg.createdAt).toDateString()
                        
                        const formatDate = (date: Date) => {
                          const today = new Date()
                          const yesterday = new Date(today)
                          yesterday.setDate(yesterday.getDate() - 1)
                          
                          if (date.toDateString() === today.toDateString()) {
                            return "Today"
                          } else if (date.toDateString() === yesterday.toDateString()) {
                            return "Yesterday"
                          } else {
                            return date.toLocaleDateString([], { 
                              weekday: 'long',
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })
                          }
                        }
                        
                        return (
                          <div key={msg.id}>
                            {showDateSeparator && (
                              <div className="flex items-center justify-center my-4">
                                <div className="flex-1 border-t border-muted"></div>
                                <span className="px-3 text-xs text-muted-foreground font-medium">
                                  {formatDate(new Date(msg.createdAt))}
                                </span>
                                <div className="flex-1 border-t border-muted"></div>
                              </div>
                            )}
                            <div
                              className={`flex ${msg.sender === "buyer" ? "justify-end" : "justify-start"}`}
                            >
                          {msg.type === "counteroffer" ? (
                            <div
                              className={`max-w-xs p-4 rounded-lg border-2 ${
                                msg.sender === "buyer"
                                  ? "bg-primary/10 border-primary/30"
                                  : "bg-muted border-muted-foreground/30"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <DollarSign className="w-4 h-4 text-primary" />
                                <span className="text-sm font-medium">Counteroffer</span>
                              </div>
                              <p className="text-2xl font-bold text-primary">₱{msg.offerAmount?.toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground mt-1">{msg.timestamp}</p>
                              {msg.offerStatus === "pending" && msg.sender !== "buyer" && (
                                <>
                                  <Badge variant="outline" className="mt-2 bg-yellow-500/20 text-yellow-600">
                                    Pending
                                  </Badge>
                                  <div className="flex gap-2 mt-3">
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => handleAcceptCounterOffer(msg.id)}
                                      className="flex-1"
                                    >
                                      Accept
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleDeclineCounterOffer(msg.id)}
                                      className="flex-1"
                                    >
                                      Decline
                                    </Button>
                                  </div>
                                </>
                              )}
                              {msg.offerStatus === "accepted" && (
                                <Badge variant="outline" className="mt-2 bg-green-500/20 text-green-600">
                                  Accepted
                                </Badge>
                              )}
                              {msg.offerStatus === "declined" && (
                                <Badge variant="outline" className="mt-2 bg-red-500/20 text-red-600">
                                  Declined
                                </Badge>
                              )}
                            </div>
                          ) : msg.type === "image" ? (
                            <div
                              className={`max-w-xs p-2 rounded-lg ${
                                msg.sender === "buyer"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-foreground"
                              }`}
                            >
                              <img
                                src={msg.imageUrl || "/placeholder.svg"}
                                alt="Attached image"
                                className="rounded max-w-full h-auto cursor-pointer hover:opacity-90 transition"
                                onClick={() => setLightboxImage(msg.imageUrl || null)}
                              />
                              <p className="text-xs mt-1 opacity-70">{msg.timestamp}</p>
                            </div>
                          ) : (
                            <div
                              className={`max-w-xs p-3 rounded-lg ${
                                msg.sender === "buyer"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-foreground"
                              }`}
                            >
                              <p className="text-sm">{msg.text}</p>
                              <p className="text-xs mt-1 opacity-70">{msg.timestamp}</p>
                            </div>
                          )}
                            </div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {attachedImages.length > 0 && (
                  <div className="px-4 py-2 border-t bg-muted/50">
                    <div className="flex items-center gap-2 overflow-x-auto">
                      {attachedImages.map((img, index) => (
                        <div key={index} className="relative flex-shrink-0">
                          <img
                            src={img || "/placeholder.svg"}
                            alt={`Attachment ${index + 1}`}
                            className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-90"
                            onClick={() => setLightboxImage(img)}
                          />
                          <button
                            onClick={() => setAttachedImages((prev) => prev.filter((_, i) => i !== index))}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {showCounterOfferInput && (
                  <div className="px-4 py-3 border-t bg-muted/50">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground mb-1 block">Your counteroffer (PHP)</label>
                        <Input
                          type="number"
                          placeholder="Enter your offer amount"
                          value={counterOfferAmount}
                          onChange={(e) => setCounterOfferAmount(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && handleSendCounterOffer()}
                        />
                      </div>
                      <div className="flex gap-2 pt-5">
                        <Button variant="outline" size="sm" onClick={() => setShowCounterOfferInput(false)}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSendCounterOffer} disabled={!counterOfferAmount}>
                          Send Offer
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 border-t flex gap-2 items-center shrink-0">
                  {/* Hidden file input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileAttach}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach image"
                    disabled={selectedContact.blocked || selectedContact.status === "completed" || selectedContact.status === "sold" || selectedContact.status === "cancelled"}
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Input
                    type="text"
                    placeholder={
                      selectedContact.blocked ? "You have blocked this user" : 
                      selectedContact.status === "completed" ? "Transaction completed" :
                      selectedContact.status === "sold" ? "Item sold" :
                      selectedContact.status === "cancelled" ? "Transaction cancelled" :
                      "Type a message..."
                    }
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    className="flex-1"
                    disabled={selectedContact.blocked || selectedContact.status === "completed" || selectedContact.status === "sold" || selectedContact.status === "cancelled"}
                  />
                  <Button onClick={handleSendMessage} size="icon" disabled={selectedContact.blocked || sendingMessage || selectedContact.status === "completed" || selectedContact.status === "sold" || selectedContact.status === "cancelled"}>
                    {sendingMessage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Select a contact to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Vouch Modal */}
      <Dialog open={showVouchModal} onOpenChange={setShowVouchModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vouch for {selectedContact?.name}</DialogTitle>
            <DialogDescription>
              Leave a vouch to help build trust in the community. This will be visible on their profile.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setVouchRating(star)} className="p-1 hover:scale-110 transition">
                    <Star
                      className={`w-6 h-6 ${star <= vouchRating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Message (optional)</label>
              <Textarea
                placeholder="Great trader, fast and reliable!"
                value={vouchMessage}
                onChange={(e) => setVouchMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVouchModal(false)} disabled={vouchSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmitVouch} disabled={vouchSubmitting}>
              {vouchSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Vouch"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Modal */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Flag className="w-5 h-5" />
              Report {selectedContact?.name}
            </DialogTitle>
            <DialogDescription>
              Report this user for violating our community guidelines. False reports may result in action against your
              account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Reason for Report *</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-background"
              >
                <option value="">Select a reason</option>
                {reportReasons.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Additional Details</label>
              <Textarea
                placeholder="Provide more details about the issue..."
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportModal(false)} disabled={reportLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSubmitReport} disabled={!reportReason || reportLoading}>
              {reportLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Report"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBlockModal} onOpenChange={setShowBlockModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5" />
              {selectedContact?.blocked ? "Unblock" : "Block"} {selectedContact?.name}?
            </DialogTitle>
            <DialogDescription>
              {selectedContact?.blocked
                ? "Unblocking this user will allow them to send you messages again."
                : "Blocking this user will prevent them from sending you messages. You can unblock them at any time."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockModal(false)}>
              Cancel
            </Button>
            <Button variant={selectedContact?.blocked ? "default" : "destructive"} onClick={handleBlockUser}>
              {selectedContact?.blocked ? "Unblock User" : "Block User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Delete Chat with {selectedContact?.name}?
            </DialogTitle>
            <DialogDescription>
              This will permanently delete all messages in this conversation. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteChat}>
              Delete Chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="!max-w-[90vw] !w-auto h-auto max-h-[90vh] p-1 sm:!max-w-[90vw]" showCloseButton={false}>
          <VisuallyHidden.Root>
            <DialogTitle>Image Preview</DialogTitle>
          </VisuallyHidden.Root>
          <div className="relative flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 z-10 bg-black/50 hover:bg-black/70 text-white"
              onClick={() => setLightboxImage(null)}
            >
              <X className="w-4 h-4" />
            </Button>
            {lightboxImage && (
              <img
                src={lightboxImage || "/placeholder.svg"}
                alt="Full size image"
                className="max-w-[88vw] max-h-[88vh] w-auto h-auto object-contain rounded"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
