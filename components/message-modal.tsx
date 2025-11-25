"use client"

import { useState, useRef, useEffect } from "react"
import { X, Send, Paperclip } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

interface MessageModalProps {
  seller: {
    username: string
    avatar: string
    lastActive?: string
  }
  listing: {
    title: string
    price: number
    image: string
  }
  onClose: () => void
  purchaseDetails?: {
    amount: number
    cost: number
  } | null
  currencyType?: string
}

export default function MessageModal({ seller, listing, onClose, purchaseDetails, currencyType }: MessageModalProps) {
  const initialMessages = purchaseDetails
    ? [
        {
          id: 1,
          sender: "buyer",
          text: `Hi! I'd like to buy ${purchaseDetails.amount.toLocaleString()} ${currencyType || "currency"} for ₱${purchaseDetails.cost.toLocaleString()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          avatar: "/user-avatar-profile.png",
          isPurchaseRequest: true,
        },
      ]
    : [
        {
          id: 1,
          sender: "seller",
          text: "Hi! Is this pet still available?",
          timestamp: "10:30 AM",
          avatar: "/user-avatar-master-trader.jpg",
        },
        {
          id: 2,
          sender: "buyer",
          text: "Yes, it is! Are you interested?",
          timestamp: "10:32 AM",
          avatar: "/user-avatar-profile.png",
        },
        {
          id: 3,
          sender: "seller",
          text: "I am! Can you provide more proof?",
          timestamp: "10:33 AM",
          avatar: "/user-avatar-master-trader.jpg",
        },
      ]

  const [messages, setMessages] = useState(initialMessages)
  const [inputValue, setInputValue] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      const newMessage = {
        id: messages.length + 1,
        sender: "buyer",
        text: inputValue,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        avatar: "/user-avatar-profile.png",
      }
      setMessages([...messages, newMessage])
      setInputValue("")
    }
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl h-96 md:h-[32rem] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-4">
              <img
                src={seller.avatar || "/placeholder.svg"}
                alt={seller.username}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <h2 className="font-bold">{seller.username}</h2>
                <p className="text-xs text-muted-foreground">{seller.lastActive}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Listing Preview - Show purchase details if available */}
          <div className="px-6 pt-4 pb-3 border-b bg-muted/50 flex items-center gap-3">
            <img
              src={listing.image || "/placeholder.svg"}
              alt={listing.title}
              className="w-12 h-12 rounded object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{listing.title}</p>
              {purchaseDetails ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">
                    Buying: {purchaseDetails.amount.toLocaleString()} {currencyType}
                  </span>
                  <span className="text-primary font-semibold">₱{purchaseDetails.cost.toLocaleString()}</span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">₱{listing.price.toLocaleString()}</p>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.sender === "buyer" ? "justify-end" : ""}`}>
                {msg.sender === "seller" && (
                  <img
                    src={msg.avatar || "/placeholder.svg"}
                    alt="Seller"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                )}
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    msg.sender === "buyer" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  } ${(msg as any).isPurchaseRequest ? "border-2 border-primary/50" : ""}`}
                >
                  <p className="text-sm">{msg.text}</p>
                  <p className="text-xs mt-1 opacity-70">{msg.timestamp}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-6 border-t flex gap-2">
            <Button size="icon" variant="outline">
              <Paperclip className="w-4 h-4" />
            </Button>
            <Input
              type="text"
              placeholder="Type a message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleSendMessage()
                }
              }}
              className="flex-1"
            />
            <Button onClick={handleSendMessage}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </div>
    </>
  )
}
