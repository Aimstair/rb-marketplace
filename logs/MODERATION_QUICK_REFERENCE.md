# Auto-Moderation Quick Reference

## 🎯 Where It Works

| Feature | Status | What's Checked |
|---------|--------|----------------|
| **Listing Creation** | ✅ Active | Title + Description |
| **Chat Messages** | ✅ Active | Message content |
| **Profile Bio** | ✅ Active | Bio text |
| Comments | ❌ Future | Comment text |
| Reviews | ❌ Future | Review text |

## 🚫 What Gets Blocked

### 1. Blacklisted Words
- Configurable in `/admin/settings`
- Case-insensitive
- Supports phrases

**Default List**:
```
free robux, scam, hack, exploit
paypal, discord, outside of platform
```

### 2. External Contacts (Auto)
- Discord links/invites
- Telegram links
- WhatsApp links
- PayPal links
- Email addresses
- Phone numbers

### 3. Scam Patterns (Auto)
- "Free Robux" scams
- "Doubling" scams
- "Send first" requests
- "Trust me" manipulation
- Hacking/exploit mentions

## 📝 Admin Tasks

### Add Blacklisted Word
1. Go to `/admin/settings`
2. Scroll to "Auto-Moderation Keywords"
3. Add word on new line
4. Click "Save Changes"

### View Blocked Content
```sql
SELECT * FROM audit_log
WHERE action = 'LISTING_BLOCKED'
ORDER BY timestamp DESC;
```

### Test Moderation
```typescript
import { moderateContent } from "@/lib/moderation"

const result = await moderateContent("test content", "message")
// Returns: { isAllowed, reason, severity }
```

## 💡 Tips

**Effective Blacklist**:
- Use specific phrases over single words
- Test before adding
- Review regularly
- Remove outdated terms

**False Positives**:
- Make patterns more specific
- Add context awareness
- Consider word boundaries

**New Scams**:
- Monitor audit logs for patterns
- Add to blacklist quickly
- Update documentation

## 🔧 Quick Fixes

**User falsely blocked**:
```typescript
// Temporarily remove word, have user resubmit
// Or manually approve in database
```

**Pattern not catching**:
```typescript
// Add to lib/moderation.ts patterns array
// Test with various formats
```

## 📊 Monitoring

**Key Metrics**:
- Blocks per day
- Most violated rules
- Repeat offenders
- New patterns emerging

**Set Alerts For**:
- >10 blocks/hour
- Same user >5 blocks
- New bypass patterns

## 🎮 User Messages

**Blocked Listing**:
> "Your listing contains prohibited content: [reason]. Please review our community guidelines."

**Blocked Message**:
> "Your message contains prohibited content: [reason]"

**Blocked Profile**:
> "Your bio contains prohibited content: [reason]"

## 🔍 Testing Commands

```bash
# Test blacklist
curl -X POST /api/listings \
  -d '{"title":"Free Robux Here!"}'

# Should return 400 with error message

# Check logs
SELECT * FROM audit_log 
WHERE action = 'LISTING_BLOCKED' 
AND details LIKE '%Free Robux%';
```

## 📞 Support

**User Reports False Block**:
1. Check audit log for details
2. Review blacklist for overly broad terms
3. Adjust if needed
4. Have user resubmit

**New Scam Pattern**:
1. Collect examples
2. Create pattern in `lib/moderation.ts`
3. Test thoroughly
4. Deploy
5. Monitor effectiveness
