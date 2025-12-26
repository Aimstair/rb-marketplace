# DigitalOcean Deployment Guide for RB Marketplace

## Prerequisites
- DigitalOcean account
- GitHub account with your code pushed
- Domain name (for custom domain)

## Step 1: Create Managed PostgreSQL Database

1. Go to DigitalOcean Dashboard
2. Click **Databases** → **Create Database Cluster**
3. Choose:
   - **Database Engine:** PostgreSQL 16
   - **Plan:** Basic ($15/month - 1GB RAM, 10GB storage)
   - **Datacenter Region:** Choose closest to your users (e.g., New York, San Francisco, Singapore)
   - **Database Name:** `marketplace-db`
4. Click **Create Database Cluster**
5. Wait 3-5 minutes for provisioning

## Step 2: Configure Database

1. In your database cluster page:
   - Go to **Users & Databases** tab
   - Create database: `marketplace_production`
   - Keep the default `doadmin` user

2. Get Connection Details:
   - Go to **Connection Details** tab
   - Select **Connection String**
   - Copy the connection string (looks like):
   ```
   postgresql://doadmin:PASSWORD@db-postgresql-nyc3-12345.ondigitalocean.com:25060/marketplace_production?sslmode=require
   ```

3. Add Trusted Sources:
   - Go to **Settings** tab
   - Under **Trusted Sources**, add DigitalOcean App Platform
   - Or allow all IPs temporarily (less secure but easier): `0.0.0.0/0`

## Step 3: Push Code to GitHub

```powershell
# Initialize git if not already
git init

# Add all files
git add .

# Commit
git commit -m "Ready for DigitalOcean deployment"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git push -u origin main
```

## Step 4: Create App Platform Application

1. Go to **Apps** → **Create App**
2. Choose **GitHub** as source
3. Authorize DigitalOcean to access your repositories
4. Select your repository: `YOUR_USERNAME/YOUR_REPO_NAME`
5. Select branch: `main`
6. Click **Next**

## Step 5: Configure App Settings

### Resources:
- **Name:** rb-marketplace
- **Type:** Web Service
- **Branch:** main
- **Source Directory:** /
- **Autodeploy:** ✅ Enabled

### Build Settings:
- **Build Command:** `npm run build`
- **Run Command:** `npm start`

### Environment Variables (Click "Edit" → Add All):

```bash
NODE_ENV=production

# Database (from Step 2)
DATABASE_URL=postgresql://doadmin:PASSWORD@db-postgresql-nyc3-12345.ondigitalocean.com:25060/marketplace_production?sslmode=require

# NextAuth (generate secret with: openssl rand -base64 32)
NEXTAUTH_URL=https://your-app-name.ondigitalocean.app
NEXTAUTH_SECRET=generate-random-32-char-string

# UploadThing (from uploadthing.com)
UPLOADTHING_SECRET=your-uploadthing-secret
UPLOADTHING_APP_ID=your-uploadthing-app-id

# PayMongo (from paymongo.com)
PAYMONGO_SECRET_KEY=your-paymongo-secret-key
PAYMONGO_PUBLIC_KEY=your-paymongo-public-key

# Optional: Email
EMAIL_SERVER=smtp://username:password@smtp.example.com:587
EMAIL_FROM=noreply@yourdomain.com
```

### Plan:
- **Size:** Basic ($12/month) - 512MB RAM, 1 vCPU
- Can upgrade later to Professional ($24/month) for more resources

## Step 6: Deploy

1. Review all settings
2. Click **Create Resources**
3. Wait 5-10 minutes for initial deployment

## Step 7: Run Database Migrations

After successful deployment:

1. Go to your app → **Console** tab
2. Click **Launch Console**
3. Run migrations:
```bash
npx prisma migrate deploy
```

4. (Optional) Seed database:
```bash
npx prisma db seed
```

## Step 8: Add Custom Domain

1. In your app settings → **Domains** tab
2. Click **Add Domain**
3. Enter your domain: `yourdomain.com`
4. DigitalOcean will provide DNS records
5. Add these records to your domain registrar:
   ```
   Type: CNAME
   Name: www
   Value: your-app-name.ondigitalocean.app
   
   Type: A
   Name: @
   Value: [IP provided by DO]
   ```

6. Update `NEXTAUTH_URL` environment variable to your custom domain:
   ```
   NEXTAUTH_URL=https://yourdomain.com
   ```

7. Redeploy the app for changes to take effect

## Step 9: Generate NEXTAUTH_SECRET

```powershell
# Generate secure secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the output and use it for `NEXTAUTH_SECRET`

## Step 10: Monitor & Scale

### View Logs:
- Go to app → **Runtime Logs** tab
- Monitor for errors or issues

### Scale Up:
- If you need more resources:
  - Go to **Settings** → **Components**
  - Upgrade to Professional plan ($24/month) for 1GB RAM

### Database Scaling:
- If database gets slow:
  - Upgrade to db-s-2vcpu-2gb ($30/month)
  - Add read replicas ($15/month each)

## Cost Breakdown

**Monthly Costs:**
- App Platform (Basic): $12/month
- PostgreSQL (Basic): $15/month
- Domain (if buying): ~$12/year
- **Total: ~$27/month**

**Optional Add-ons:**
- Backups: Included in managed DB
- SSL Certificate: Free (Let's Encrypt)
- CDN: $5/month (if needed later)

## Troubleshooting

### Build Fails:
```bash
# Check build logs in DigitalOcean dashboard
# Common issues:
# 1. Missing environment variables
# 2. Wrong Node version (specify in package.json)
```

### Database Connection Error:
```bash
# Verify DATABASE_URL is correct
# Check Trusted Sources in database settings
# Ensure ?sslmode=require is in connection string
```

### Migrations Fail:
```bash
# Access console and run:
npx prisma migrate reset --force
npx prisma migrate deploy
```

## Next Steps

1. ✅ Set up automatic backups (included)
2. ✅ Enable alerts for app performance
3. ✅ Set up monitoring with DigitalOcean Monitoring (free)
4. ⚙️ Configure CDN for static assets (optional)
5. 📊 Set up analytics (Google Analytics, Plausible, etc.)

## Support

- DigitalOcean Docs: https://docs.digitalocean.com/products/app-platform/
- Community: https://www.digitalocean.com/community
- Support Tickets: https://cloud.digitalocean.com/support/tickets

---

**Estimated Setup Time:** 30-45 minutes
**Total Cost:** ~$27/month
