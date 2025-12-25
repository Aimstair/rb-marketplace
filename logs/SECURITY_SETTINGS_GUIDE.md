# Security Settings Quick Reference

## Admin Dashboard Configuration

Navigate to `/admin/settings` to configure all security settings.

### Security Section Settings

| Setting | Key | Default | Description |
|---------|-----|---------|-------------|
| New User Registration | `registration_enabled` | true | Enable/disable new user signups |
| New User Limit (Week) | `new_user_limit_week` | 5000 | Max Robux new users can sell per week |
| New User Limit (Month) | `new_user_limit_month` | 25000 | Max Robux new users can sell per month |
| IP Rate Limit | `ip_rate_limit` | 60 | Max requests per minute from one IP |
| Failed Login Lockout | `failed_login_lockout` | 5 | Failed attempts before account lock |

## How To Use

### 1. Configure Settings in Admin Dashboard

1. Login as admin
2. Go to `/admin/settings`
3. Scroll to "Security Settings" section
4. Adjust values as needed
5. Click "Save Changes"

### 2. Apply Rate Limiting to API Routes

```typescript
// app/api/your-route/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withRateLimit } from "@/app/api/middleware/rate-limit"

export async function GET(request: NextRequest) {
  return withRateLimit(request, async () => {
    // Your API logic here
    return NextResponse.json({ data: "..." })
  })
}

export async function POST(request: NextRequest) {
  return withRateLimit(request, async () => {
    const body = await request.json()
    // Your API logic here
    return NextResponse.json({ success: true })
  })
}
```

### 3. Monitor Security Events

**Failed Login Attempts**:
```sql
-- Find users with failed login attempts
SELECT username, email, failedLoginAttempts, lockedUntil
FROM users
WHERE failedLoginAttempts > 0 OR lockedUntil IS NOT NULL
ORDER BY failedLoginAttempts DESC;
```

**New User Sales Tracking**:
```sql
-- Check new user sales totals
SELECT username, joinDate, totalSalesThisWeek, totalSalesThisMonth
FROM users
WHERE joinDate > DATE_SUB(NOW(), INTERVAL 30 DAY)
  AND (totalSalesThisWeek > 0 OR totalSalesThisMonth > 0)
ORDER BY totalSalesThisMonth DESC;
```

### 4. Common Tasks

**Unlock Locked Account**:
```typescript
// In admin actions or database
await prisma.user.update({
  where: { id: "user-id" },
  data: {
    failedLoginAttempts: 0,
    lockedUntil: null
  }
})
```

**Reset New User Sales Counter**:
```typescript
await prisma.user.update({
  where: { id: "user-id" },
  data: {
    totalSalesThisWeek: 0,
    totalSalesThisMonth: 0,
    salesResetWeek: new Date(),
    salesResetMonth: new Date()
  }
})
```

**Temporarily Disable Registration**:
```typescript
await prisma.systemSettings.upsert({
  where: { key: "registration_enabled" },
  update: { value: "false" },
  create: {
    key: "registration_enabled",
    value: "false",
    category: "security"
  }
})
```

## Error Messages

Users will see these messages when security limits are hit:

### Failed Login Lockout
- `"Invalid password. X attempt(s) remaining"` - After failed attempt
- `"Too many failed attempts. Account locked for 15 minutes"` - When locked
- `"Account locked. Try again in X minute(s)"` - During lock period

### New User Selling Limits
- `"New user weekly selling limit exceeded. Limit: X Robux"` - When week limit hit
- `"New user monthly selling limit exceeded. Limit: X Robux"` - When month limit hit

### Rate Limiting
- `"Too many requests. Please try again later."` - HTTP 429 response
- Response headers include reset time and retry-after seconds

### Registration Disabled
- `"New user registration is currently disabled"` - When trying to sign up

## Testing

### Test Failed Login Lockout
1. Try to login with wrong password 5 times
2. Observe error messages counting down attempts
3. On 5th attempt, verify account locks
4. Try to login and see "Account locked" message
5. Wait 15 minutes or manually unlock
6. Login successfully and verify counter resets

### Test New User Limits
1. Create new account (or use one less than 30 days old)
2. Create listing and complete transaction
3. Check database to see `totalSalesThisWeek` updated
4. Create more transactions to approach limit
5. Verify transaction blocked when limit exceeded

### Test Rate Limiting
1. Write script to make 61 requests in 1 minute:
```bash
for i in {1..61}; do
  curl -i http://localhost:3000/api/settings/maintenance
done
```
2. Verify requests 1-60 succeed (200 OK)
3. Verify request 61 fails (429 Too Many Requests)
4. Check response headers for rate limit info
5. Wait 1 minute and verify limit resets

### Test Registration Control
1. Go to `/admin/settings`
2. Uncheck "New User Registration"
3. Click "Save Changes"
4. Try to access `/auth/signup`
5. Try to submit signup form
6. Verify error message shown
7. Re-enable and verify signups work

## Monitoring and Alerts

### Recommended Monitoring

1. **Failed Login Attempts**
   - Alert when user reaches 3+ failed attempts
   - Alert when multiple accounts locked in short time
   - Monitor for patterns (same IP, time range)

2. **New User Sales**
   - Track users approaching weekly/monthly limits
   - Alert when many new users hit limits (could indicate fraud)
   - Monitor for accounts created just to bypass limits

3. **Rate Limiting**
   - Log IPs that frequently hit rate limit
   - Alert on sustained high traffic from single IP
   - Consider IP blacklist for repeat offenders

4. **Registration Patterns**
   - Monitor signup rates during maintenance mode
   - Track failed signup attempts
   - Alert on unusual spikes in registrations

## Security Best Practices

✅ **DO**:
- Regularly review locked accounts
- Monitor new user sales patterns
- Adjust limits based on actual usage
- Keep rate limits reasonable for normal users
- Test changes in staging before production

❌ **DON'T**:
- Set rate limits too low (frustrates users)
- Set new user limits too low (restricts legitimate sellers)
- Ignore locked account alerts (could indicate attack)
- Disable security features without review
- Share security settings with non-admin users

## Troubleshooting

### "Account locked" but user can't wait
**Solution**: Admin can manually unlock:
```sql
UPDATE users 
SET failedLoginAttempts = 0, lockedUntil = NULL 
WHERE email = 'user@example.com';
```

### Rate limit blocking legitimate traffic
**Solution**: 
1. Check if cloudflare/proxy causing IP issues
2. Increase `ip_rate_limit` setting
3. Whitelist specific IPs if needed

### New user can't complete transaction
**Solution**:
1. Check if under 30 days old
2. Review `totalSalesThisWeek` and `totalSalesThisMonth`
3. Either wait for counter reset or admin can manually reset
4. Consider increasing limits if too restrictive

### Registration disabled but admin needs to add user
**Solution**:
1. Admin can create user directly in database
2. Or temporarily enable registration
3. Or implement admin user creation feature
