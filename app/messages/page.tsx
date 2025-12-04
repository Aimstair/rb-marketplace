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
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getConversations, getMessages, sendMessage, markMessagesAsRead, getOrCreateConversation, acceptCounterOffer, declineCounterOffer } from "@/app/actions/messages"
import type { ConversationWithLatestMessage, MessageData } from "@/app/actions/messages"
import {
  getTransactionById,
  getTransactionByPeers,
  toggleTransactionConfirmation,
  submitVouch,
} from "@/app/actions/transactions"
import type { TransactionData } from "@/app/actions/transactions"

type Contact = {
  id: string
  otherUserId: string
  name: string
  lastMessage: string
  timestamp: string
  online: boolean
  role: "seller" | "buyer"
  status: "ongoing" | "completed" | "sold"
  blocked: boolean
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
}

type Message = {
  id: string
  sender: "buyer" | "seller"
  text: string
  timestamp: string
  type?: "text" | "counteroffer" | "image"
  offerAmount?: number
  offerStatus?: "pending" | "accepted" | "rejected" | "declined"
  imageUrl?: string
}

const getStatusBadge = (status: "ongoing" | "completed" | "sold") => {
  switch (status) {
    case "ongoing":
      return { label: "Ongoing", className: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30" }
    case "completed":
      return { label: "Completed", className: "bg-green-500/20 text-green-600 border-green-500/30" }
    case "sold":
      return { label: "Sold", className: "bg-red-500/20 text-red-600 border-red-500/30" }
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

            await getOrCreateConversation(sellerId, itemId || undefined, txDetails)
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
              let contactStatus: "ongoing" | "completed" | "sold" = "ongoing"
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
                  contactStatus = "sold"
                } else {
                  contactStatus = "ongoing"
                }
              } else if (conv.listing?.status === "sold") {
                contactStatus = "sold"
              }
              
              return {
                id: conv.id,
                otherUserId: conv.otherUser.id,
                name: conv.otherUser.username,
                lastMessage: conv.latestMessage?.content || "No messages yet",
                timestamp: conv.latestMessage
                  ? new Date(conv.latestMessage.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Just now",
                online: false,
                role: conv.buyerId === user.id ? "seller" : "buyer",
                status: contactStatus,
                blocked: false,
                item: conv.listing || {
                  id: "unknown",
                  title: "Unknown Item",
                  price: 0,
                  image: "/placeholder.svg",
                },
                transactionStatus: transactionData,
                transaction: (conv as any).transaction || null,
              }
            })
          )
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
        } else {
          messageResult = result // Track the last result
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
          return
        }

        messageResult = result // Track the text message result

        // Add optimistic message update
        const newMessage: Message = {
          id: `temp-${Date.now()}`,
          sender: "buyer",
          text: messageText,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          type: "text",
        }
        setMessages((prev) => [...prev, newMessage])
        
        // Clear amount query param after first message
        setAmountQueryParam(null)
      }

      // If transaction was just created or transaction state is null, load it immediately
      if (messageResult?.transactionCreated || !transaction) {
        console.log("🔄 Loading transaction after message send...")
        // Reload the full conversation to get updated transaction
        const conversationsResult = await getConversations()
        if (conversationsResult.success && conversationsResult.conversations && selectedConversationId) {
          const updatedConv = conversationsResult.conversations.find(c => c.id === selectedConversationId)
          if (updatedConv && (updatedConv as any).transaction) {
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
              userVouched: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
            setTransaction(fullTransaction)
            console.log("✅ Transaction loaded after message:", fullTransaction)
          }
        }
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
              let contactStatus: "ongoing" | "completed" | "sold" = "ongoing"
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
                  contactStatus = "sold"
                } else {
                  contactStatus = "ongoing"
                }
              } else if (conv.listing?.status === "sold") {
                contactStatus = "sold"
              }
              
              return {
                id: conv.id,
                otherUserId: conv.otherUser.id,
                name: conv.otherUser.username,
                lastMessage: conv.latestMessage?.content || "No messages yet",
                timestamp: conv.latestMessage
                  ? new Date(conv.latestMessage.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Just now",
                online: false,
                role: conv.buyerId === user?.id ? "seller" : "buyer",
                status: contactStatus,
                blocked: false,
                item: conv.listing || {
                  id: "unknown",
                  title: "Unknown Item",
                  price: 0,
                  image: "/placeholder.svg",
                },
                transactionStatus: transactionData,
                transaction: (conv as any).transaction || null,
              }
            })
          )
          setContacts(convertedContacts)
        }
      }

      setMessageText("")
      setAttachedImages([])
    } catch (error) {
      console.error("Error sending message:", error)
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
        return
      }

      // Add optimistic message update
      const newMessage: Message = {
        id: result.messageId || `counteroffer-${Date.now()}`,
        sender: "buyer",
        text: `I'd like to make a counteroffer`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type: "counteroffer",
        offerAmount: amount,
        offerStatus: "pending",
      }
      setMessages((prev) => [...prev, newMessage])
      setCounterOfferAmount("")
      setShowCounterOfferInput(false)
    } catch (error) {
      console.error("Error sending counteroffer:", error)
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
        alert(result.error || "Failed to mark transaction as complete")
      }
    } catch (error) {
      console.error("Error marking complete:", error)
      alert("Failed to mark transaction as complete")
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
        alert(result.error || "Failed to submit vouch")
      }
    } catch (error) {
      console.error("Error submitting vouch:", error)
      alert("Failed to submit vouch")
    } finally {
      setVouchSubmitting(false)
    }
  }

  const handleSubmitReport = () => {
    if (!selectedContact || !reportReason) return
    setShowReportModal(false)
    setReportReason("")
    setReportDetails("")
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
        alert(result.error || "Failed to accept counteroffer")
      }
    } catch (error) {
      console.error("Error accepting counteroffer:", error)
      alert("Failed to accept counteroffer")
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
        alert(result.error || "Failed to decline counteroffer")
      }
    } catch (error) {
      console.error("Error declining counteroffer:", error)
      alert("Failed to decline counteroffer")
    }
  }

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact)
    setSelectedConversationId(contact.id)
    setShowCounterOfferInput(false)
    setConversationSearch("")
    setMessages([])
    
    // Use conversation-specific transaction from contact data
    if (contact.transaction) {
      // Map the simplified transaction to full TransactionData format
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
        amount: contact.transaction.amount,
        status: contact.transaction.status,
        buyerConfirmed: contact.transaction.buyerConfirmed,
        sellerConfirmed: contact.transaction.sellerConfirmed,
        userVouched: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem onClick={() => setStatusFilter("all")}>All Status</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("ongoing")}>Ongoing</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("completed")}>Completed</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("sold")}>Sold</DropdownMenuItem>
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
                  return (
                    <button
                      key={contact.id}
                      onClick={() => handleSelectContact(contact)}
                      className={`w-full p-4 border-b text-left hover:bg-muted transition ${
                        selectedContact?.id === contact.id ? "bg-muted border-l-2 border-l-primary" : ""
                      } ${contact.blocked ? "opacity-50" : ""}`}
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
                      disabled={selectedContact.blocked || selectedContact.status === "completed" || selectedContact.status === "sold"}
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
                            (() => {
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
                            })()
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
                      {filteredMessages.map((msg) => (
                        <div
                          key={msg.id}
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
                      ))}
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
                    disabled={selectedContact.blocked || selectedContact.status === "completed" || selectedContact.status === "sold"}
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Input
                    type="text"
                    placeholder={
                      selectedContact.blocked ? "You have blocked this user" : 
                      selectedContact.status === "completed" ? "Transaction completed" :
                      selectedContact.status === "sold" ? "Item sold" :
                      "Type a message..."
                    }
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    className="flex-1"
                    disabled={selectedContact.blocked || selectedContact.status === "completed" || selectedContact.status === "sold"}
                  />
                  <Button onClick={handleSendMessage} size="icon" disabled={selectedContact.blocked || sendingMessage || selectedContact.status === "completed" || selectedContact.status === "sold"}>
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
            <Button variant="outline" onClick={() => setShowReportModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSubmitReport} disabled={!reportReason}>
              Submit Report
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
        <DialogContent className="max-w-3xl p-2">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
              onClick={() => setLightboxImage(null)}
            >
              <X className="w-4 h-4" />
            </Button>
            {lightboxImage && (
              <img
                src={lightboxImage || "/placeholder.svg"}
                alt="Full size image"
                className="w-full h-auto max-h-[80vh] object-contain rounded"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
