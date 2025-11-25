"use client"

import type React from "react"

import Navigation from "@/components/navigation"
import { useAuth } from "@/lib/auth-context"
import { useRouter, useSearchParams } from "next/navigation"
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

const RECENT_CONTACTS = [
  {
    id: "user-2",
    name: "FastSeller123",
    lastMessage: "Thanks for trading!",
    timestamp: "2 min ago",
    online: true,
    role: "seller" as const,
    status: "ongoing" as const,
    blocked: false,
    item: {
      id: 1,
      title: "Golden Dragon Pet",
      price: 2500,
      image: "/golden-dragon-pet-roblox.jpg",
    },
    transactionStatus: {
      buyerConfirmed: false,
      sellerConfirmed: false,
      buyerVouched: false,
      sellerVouched: false,
    },
  },
  {
    id: "user-3",
    name: "CurrencyKing",
    lastMessage: "Still available?",
    timestamp: "1 hour ago",
    online: false,
    role: "buyer" as const,
    status: "completed" as const,
    blocked: false,
    item: {
      id: 2,
      title: "10,000 Robux",
      price: 1500,
      image: "/robux-currency.jpg",
    },
    transactionStatus: {
      buyerConfirmed: true,
      sellerConfirmed: true,
      buyerVouched: true,
      sellerVouched: false,
    },
  },
  {
    id: "user-4",
    name: "LimitedHunter",
    lastMessage: "Can you lower the price?",
    timestamp: "3 hours ago",
    online: true,
    role: "seller" as const,
    status: "sold" as const,
    blocked: false,
    item: {
      id: 3,
      title: "Dominus Infernus",
      price: 50000,
      image: "/roblox-dominus-hat.jpg",
    },
    transactionStatus: {
      buyerConfirmed: false,
      sellerConfirmed: false,
      buyerVouched: false,
      sellerVouched: false,
    },
  },
  {
    id: "user-5",
    name: "SafeTrader99",
    lastMessage: "I have the item you want",
    timestamp: "Yesterday",
    online: false,
    role: "seller" as const,
    status: "completed" as const,
    blocked: false,
    item: {
      id: 4,
      title: "Neon Unicorn",
      price: 3200,
      image: "/adopt-me-neon-unicorn.jpg",
    },
    transactionStatus: {
      buyerConfirmed: true,
      sellerConfirmed: true,
      buyerVouched: true,
      sellerVouched: true,
    },
  },
]

type Contact = (typeof RECENT_CONTACTS)[0]

type Message = {
  id: number
  sender: "buyer" | "seller"
  text: string
  timestamp: string
  type?: "text" | "counteroffer" | "image"
  offerAmount?: number
  offerStatus?: "pending" | "accepted" | "rejected"
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
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [contacts, setContacts] = useState(RECENT_CONTACTS)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
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

  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
    }
  }, [user, router])

  useEffect(() => {
    const sellerId = searchParams.get("sellerId")
    const sellerName = searchParams.get("sellerName")
    const sellerAvatar = searchParams.get("sellerAvatar")
    const itemId = searchParams.get("itemId")
    const itemTitle = searchParams.get("itemTitle")
    const itemPrice = searchParams.get("itemPrice")
    const itemImage = searchParams.get("itemImage")
    const type = searchParams.get("type")
    const currencyType = searchParams.get("currencyType")
    const amount = searchParams.get("amount")
    const cost = searchParams.get("cost")

    if (sellerId && sellerName && itemTitle) {
      const existingContact = contacts.find((c) => c.id === `seller-${sellerId}`)

      if (existingContact) {
        setSelectedContact(existingContact)
      } else {
        const newContact: Contact = {
          id: `seller-${sellerId}`,
          name: sellerName,
          lastMessage:
            type === "currency"
              ? `Interested in buying ${Number(amount).toLocaleString()} ${currencyType}`
              : "Interested in this item",
          timestamp: "Just now",
          online: true,
          role: "seller",
          status: "ongoing",
          blocked: false,
          item: {
            id: Number(itemId) || 0,
            title: itemTitle,
            price: Number(itemPrice) || 0,
            image: itemImage || "/placeholder.svg",
          },
          transactionStatus: {
            buyerConfirmed: false,
            sellerConfirmed: false,
            buyerVouched: false,
            sellerVouched: false,
          },
        }

        setContacts((prev) => [newContact, ...prev])
        setSelectedContact(newContact)

        if (type === "currency" && amount && cost && currencyType) {
          setMessages([
            {
              id: 1,
              sender: "buyer",
              text: `Hi! I'd like to buy ${Number(amount).toLocaleString()} ${currencyType} for ₱${Number(cost).toLocaleString()}`,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              type: "text",
            },
          ])
        } else {
          setMessages([
            {
              id: 1,
              sender: "buyer",
              text: `Hi! I'm interested in "${itemTitle}" listed at ₱${Number(itemPrice).toLocaleString()}. Is it still available?`,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              type: "text",
            },
          ])
        }
      }
      router.replace("/messages", { scroll: false })
    }
  }, [searchParams, contacts, router])

  useEffect(() => {
    if (selectedContact && messages.length === 0) {
      setMessages([
        {
          id: 1,
          sender: "seller",
          text: selectedContact.lastMessage,
          timestamp: selectedContact.timestamp,
          type: "text",
        },
      ])
    }
  }, [selectedContact])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  if (!user) return null

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

  const handleSendMessage = () => {
    if (messageText.trim() || attachedImages.length > 0) {
      // Send attached images first
      attachedImages.forEach((imgUrl, index) => {
        const imageMessage: Message = {
          id: messages.length + index + 1,
          sender: "buyer",
          text: "",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          type: "image",
          imageUrl: imgUrl,
        }
        setMessages((prev) => [...prev, imageMessage])
      })

      // Then send text message if any
      if (messageText.trim()) {
        const newMessage: Message = {
          id: messages.length + attachedImages.length + 1,
          sender: "buyer",
          text: messageText,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          type: "text",
        }
        setMessages((prev) => [...prev, newMessage])
      }

      setMessageText("")
      setAttachedImages([])
    }
  }

  const handleSendCounterOffer = () => {
    const amount = Number(counterOfferAmount)
    if (!amount || amount <= 0) return

    const newMessage: Message = {
      id: messages.length + 1,
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

  const handleMarkComplete = () => {
    if (!selectedContact) return

    setContacts((prev) =>
      prev.map((contact) => {
        if (contact.id === selectedContact.id) {
          const updatedStatus = { ...contact.transactionStatus }
          if (contact.role === "seller") {
            updatedStatus.buyerConfirmed = true
          } else {
            updatedStatus.sellerConfirmed = true
          }
          const newStatus = updatedStatus.buyerConfirmed && updatedStatus.sellerConfirmed ? "completed" : contact.status
          return { ...contact, transactionStatus: updatedStatus, status: newStatus as typeof contact.status }
        }
        return contact
      }),
    )

    setSelectedContact((prev) => {
      if (!prev) return null
      const updatedStatus = { ...prev.transactionStatus }
      if (prev.role === "seller") {
        updatedStatus.buyerConfirmed = true
      } else {
        updatedStatus.sellerConfirmed = true
      }
      const newStatus = updatedStatus.buyerConfirmed && updatedStatus.sellerConfirmed ? "completed" : prev.status
      return { ...prev, transactionStatus: updatedStatus, status: newStatus as typeof prev.status }
    })
  }

  const handleSubmitVouch = () => {
    if (!selectedContact) return

    setContacts((prev) =>
      prev.map((contact) => {
        if (contact.id === selectedContact.id) {
          const updatedStatus = { ...contact.transactionStatus }
          if (contact.role === "seller") {
            updatedStatus.buyerVouched = true
          } else {
            updatedStatus.sellerVouched = true
          }
          return { ...contact, transactionStatus: updatedStatus }
        }
        return contact
      }),
    )

    setSelectedContact((prev) => {
      if (!prev) return null
      const updatedStatus = { ...prev.transactionStatus }
      if (prev.role === "seller") {
        updatedStatus.buyerVouched = true
      } else {
        updatedStatus.sellerVouched = true
      }
      return { ...prev, transactionStatus: updatedStatus }
    })

    setShowVouchModal(false)
    setVouchMessage("")
    setVouchRating(5)
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

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact)
    setMessages([
      {
        id: 1,
        sender: "seller",
        text: contact.lastMessage,
        timestamp: contact.timestamp,
        type: "text",
      },
    ])
    setShowCounterOfferInput(false)
    setConversationSearch("")
  }

  const canMarkComplete = selectedContact
    ? selectedContact.role === "seller"
      ? !selectedContact.transactionStatus.buyerConfirmed
      : !selectedContact.transactionStatus.sellerConfirmed
    : false

  const hasUserConfirmed = selectedContact
    ? selectedContact.role === "seller"
      ? selectedContact.transactionStatus.buyerConfirmed
      : selectedContact.transactionStatus.sellerConfirmed
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
              {filteredContacts.length === 0 ? (
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
                        {selectedContact.name}
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
                      <p className="text-primary font-bold">PHP {selectedContact.item.price.toLocaleString()}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowCounterOfferInput(!showCounterOfferInput)}
                      title="Make a counteroffer"
                      disabled={selectedContact.blocked}
                      className="h-10 w-10"
                    >
                      <DollarSign className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                {/* Transaction Status Bar */}
                <div className="px-4 py-3 border-b bg-secondary/30">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle
                          className={`w-4 h-4 ${selectedContact.transactionStatus.buyerConfirmed ? "text-green-500" : "text-muted-foreground"}`}
                        />
                        <span
                          className={
                            selectedContact.transactionStatus.buyerConfirmed
                              ? "text-green-600"
                              : "text-muted-foreground"
                          }
                        >
                          Buyer {selectedContact.transactionStatus.buyerConfirmed ? "confirmed" : "pending"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle
                          className={`w-4 h-4 ${selectedContact.transactionStatus.sellerConfirmed ? "text-green-500" : "text-muted-foreground"}`}
                        />
                        <span
                          className={
                            selectedContact.transactionStatus.sellerConfirmed
                              ? "text-green-600"
                              : "text-muted-foreground"
                          }
                        >
                          Seller {selectedContact.transactionStatus.sellerConfirmed ? "confirmed" : "pending"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {canMarkComplete && selectedContact.status !== "sold" && (
                        <Button size="sm" onClick={handleMarkComplete}>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark as Complete
                        </Button>
                      )}
                      {selectedContact.status === "sold" && (
                        <span className="text-sm text-red-500 flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" />
                          Item sold to another buyer
                        </span>
                      )}
                      {hasUserConfirmed && !bothConfirmed && selectedContact.status !== "sold" && (
                        <span className="text-sm text-muted-foreground">Waiting for other party...</span>
                      )}
                      {canVouch && (
                        <Button size="sm" variant="secondary" onClick={() => setShowVouchModal(true)}>
                          <Star className="w-4 h-4 mr-2" />
                          Vouch for {selectedContact.name}
                        </Button>
                      )}
                      {hasVouched && (
                        <span className="text-sm text-green-600 flex items-center gap-1">
                          <Star className="w-4 h-4 fill-green-500" />
                          Vouched
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 chat-scrollbar">
                  {selectedContact.blocked ? (
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
                              {msg.offerStatus === "pending" && (
                                <Badge variant="outline" className="mt-2 bg-yellow-500/20 text-yellow-600">
                                  Pending
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
                    disabled={selectedContact.blocked}
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Input
                    type="text"
                    placeholder={selectedContact.blocked ? "You have blocked this user" : "Type a message..."}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    className="flex-1"
                    disabled={selectedContact.blocked}
                  />
                  <Button onClick={handleSendMessage} size="icon" disabled={selectedContact.blocked}>
                    <Send className="w-4 h-4" />
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
            <Button variant="outline" onClick={() => setShowVouchModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitVouch}>Submit Vouch</Button>
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
