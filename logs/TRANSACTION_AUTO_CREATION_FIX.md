# Transaction Auto-Creation and Chat Integration Fix

## Overview
Fixed the "No active transaction" issue in chat by implementing automatic transaction creation when users interact, and adding transaction loading functionality to display transaction status in the chat interface.

## Changes Made

### 1. Backend: New `getTransactionByPeers` Function
**File:** `app/actions/transactions.ts`

Added a new server action to fetch transactions by listing ID and peer user ID:

```typescript
export async function getTransactionByPeers(
  listingId: string,
  otherUserId: string
): Promise<{
  success: boolean
  transaction?: TransactionData
  error?: string
}>
```

**Purpose:**
- Finds a transaction where the listing matches AND participants are the current user and `otherUserId`
- Returns the transaction data if found
- Returns success with `undefined` if no transaction (not treated as error)

**Logic:**
- Validates both `listingId` and `otherUserId` are provided
- Uses `findFirst` to locate transaction by listing and user pair
- Includes full transaction details (buyer, seller, listing, confirmation status)
- Gracefully handles errors without breaking the app

### 2. Backend: Enhanced `sendMessage` Function
**File:** `app/actions/messages.ts`

Updated the `sendMessage` function to auto-create transactions:

**New Logic:**
1. After message is created, checks if conversation has an associated `listingId`
2. If listing exists, checks if a transaction already exists for this listing + user pair
3. If NO transaction exists, automatically creates a new `PENDING` transaction
4. Sets both buyer and seller from conversation data
5. Fails gracefully if transaction creation fails (doesn't break message sending)

**Key Features:**
- Ensures transactions are "activated" when users reply to each other
- Prevents duplicate transactions (checks before creating)
- Non-blocking: message sends even if transaction creation fails
- Logs errors for debugging without disrupting user experience

**Transaction Auto-Creation Rules:**
- Only creates if `conversation.listingId` exists
- Creates with `status: "PENDING"`
- Uses conversation's `buyerId` and `sellerId`
- Sets `price: 0` (will be confirmed by user later)

### 3. Frontend: Enhanced Contact Type
**File:** `app/messages/page.tsx`

Added `otherUserId` field to the Contact type:

```typescript
type Contact = {
  id: string
  otherUserId: string  // ← NEW: The ID of the other user in conversation
  name: string
  // ... other fields
}
```

**Purpose:** Enables passing the correct peer user ID to `getTransactionByPeers`

### 4. Frontend: Updated Conversation Mapping
**File:** `app/messages/page.tsx`

Modified conversation-to-contact mapping to include other user's ID:

```typescript
const convertedContacts: Contact[] = result.conversations.map((conv) => ({
  id: conv.id,
  otherUserId: conv.otherUser.id,  // ← NEW
  name: conv.otherUser.username,
  // ... rest of mapping
}))
```

### 5. Frontend: Implemented `loadTransaction` Function
**File:** `app/messages/page.tsx`

Fully implemented the previously empty `handleSelectContact` function:

```typescript
const handleSelectContact = (contact: Contact) => {
  setSelectedContact(contact)
  setSelectedConversationId(contact.id)
  setShowCounterOfferInput(false)
  setConversationSearch("")
  setMessages([])
  setTransaction(null)

  // Load transaction for this conversation (linked by listing)
  const loadTransaction = async () => {
    if (contact.item.id === "unknown") return

    try {
      // Get transaction by listing ID and other user ID
      const result = await getTransactionByPeers(contact.item.id, contact.otherUserId)
      if (result.success && result.transaction) {
        setTransaction(result.transaction)
        // Update contact status if transaction exists
        setSelectedContact((prev) => {
          if (!prev) return null
          return {
            ...prev,
            status: result.transaction?.status === "COMPLETED" ? "completed" 
                   : result.transaction?.status === "CANCELLED" ? "sold" 
                   : "ongoing",
            transactionStatus: {
              buyerConfirmed: result.transaction?.buyerConfirmed || false,
              sellerConfirmed: result.transaction?.sellerConfirmed || false,
              buyerVouched: false,
              sellerVouched: false,
            },
          }
        })
      }
    } catch (error) {
      console.error("Error loading transaction:", error)
    }
  }

  loadTransaction()
}
```

**Features:**
- Calls `getTransactionByPeers` with listing ID and other user ID
- Updates transaction state if found
- Updates contact status badge based on transaction status
- Updates transaction confirmation flags
- Gracefully handles missing items (skips if `item.id === "unknown"`)

### 6. Frontend: Updated Imports
**File:** `app/messages/page.tsx`

Added `getTransactionByPeers` to the import statement:

```typescript
import {
  getTransactionById,
  getTransactionByPeers,  // ← NEW
  toggleTransactionConfirmation,
  submitVouch,
} from "@/app/actions/transactions"
```

## Data Flow

### When User Opens Chat:
1. `handleSelectContact()` is called
2. `loadTransaction()` executes asynchronously
3. Calls `getTransactionByPeers(contact.item.id, contact.otherUserId)`
4. If transaction found:
   - `transaction` state updated with full transaction data
   - Contact status badge updated (ongoing/completed/sold)
   - Confirmation flags synced with transaction
5. UI components now show accurate status and action buttons

### When User Sends Message with Listing:
1. `sendMessage()` executes
2. Message created in database
3. Transaction auto-creation check:
   - Is there a `listingId` on conversation?
   - Does a transaction already exist?
   - If no transaction exists, create one
4. Message sent successfully regardless of transaction creation result
5. Next time chat loads, `getTransactionByPeers` finds the newly created transaction

## Status Reflection in UI

The status bar in `app/messages/page.tsx` now correctly reflects:

| Status | Badge | Buttons | Confirmation |
|--------|-------|---------|--------------|
| PENDING | Yellow "Ongoing" | "Confirm Completion", "Cancel Order" | Shows who has confirmed |
| COMPLETED | Green "Completed" | "Leave Vouch" (if not already) | Both confirmed ✓ |
| CANCELLED | Red "Sold" | Disabled | Cancelled |

## Error Handling

**Transaction Creation Failures:**
- Non-blocking: message sends even if transaction creation fails
- Logged to console for debugging
- User can still interact with chat

**Transaction Loading Failures:**
- Logged to console
- Chat still functional without transaction UI
- Will retry on next message or manual reload

**Missing Data:**
- Skips transaction loading if `contact.item.id === "unknown"`
- Uses fallback values for confirmation status
- Safely handles undefined transactions

## Testing Checklist

- [ ] User opens chat → transaction loads if exists
- [ ] User sends first message in listing chat → transaction auto-created
- [ ] Second reply → existing transaction found, not duplicated
- [ ] Status badge updates accurately
- [ ] Confirm/Vouch buttons appear based on transaction status
- [ ] Can toggle confirmation without transaction creation errors
- [ ] Chat remains functional if transaction operations fail

## Files Modified

1. ✅ `app/actions/transactions.ts` - Added `getTransactionByPeers`
2. ✅ `app/actions/messages.ts` - Enhanced `sendMessage` with auto-creation
3. ✅ `app/messages/page.tsx` - Updated Contact type, imports, and `handleSelectContact`

## Build Status

✅ **Build Successful** - All 34 routes compile without errors
