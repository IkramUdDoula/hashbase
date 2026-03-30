# Railway Deployment Guide - Hashbase

## ✅ Deployment Complete!

Your Hashbase application is successfully deployed on Railway!

### 🌐 Live URL
**Production:** https://hashbase-production.up.railway.app

### 📊 Project Details
- **Project Name:** Hashbase
- **Environment:** production
- **Services:**
  - `hashbase` - Main application (Node.js + Vite)
  - `Postgres` - PostgreSQL database

---

## 🔧 Configuration Summary

### Environment Variables Set

All required environment variables have been configured:

#### Database
- ✅ `DATABASE_URL` - Linked to Postgres service

#### Gmail OAuth
- ✅ `GMAIL_CLIENT_ID` - Google OAuth client ID
- ✅ `GMAIL_CLIENT_SECRET` - Google OAuth client secret
- ✅ `GMAIL_REDIRECT_URI` - https://hashbase-production.up.railway.app/oauth2callback

#### News API
- ✅ `NEWS_API_KEY` - NewsAPI.org API key

#### Frontend Configuration (Vite)
- ✅ `VITE_API_URL` - https://hashbase-production.up.railway.app
- ✅ `VITE_FRONTEND_URL` - https://hashbase-production.up.railway.app
- ✅ `VITE_ENV` - dev
- ✅ `VITE_CONFIG_ENCRYPTION_KEY` - AES-256 encryption key

#### GitHub Landing Page
- ✅ `VITE_GITHUB_LANDING_TOKEN` - GitHub personal access token
- ✅ `VITE_GITHUB_LANDING_OWNER` - ikramuddoula
- ✅ `VITE_GITHUB_LANDING_REPO` - hashbase

### Database Schema
- ✅ `gmail_tokens` table created and verified
- ✅ Indexes and triggers configured
- ✅ Token persistence enabled

---

## 🚀 Deployment Commands Used

```bash
# Initialize Railway project
railway init

# Add PostgreSQL database
railway add --database postgres

# Link to service
railway service link hashbase

# Set environment variables
railway variables --set "VARIABLE_NAME=value"

# Link DATABASE_URL from Postgres
railway variables --set 'DATABASE_URL=${{Postgres.DATABASE_URL}}'

# Deploy application
railway up --detach

# Run database migration
railway run node migrate-railway.js

# View logs
railway logs

# Check status
railway status
```

---

## ⚙️ Important Configuration Notes

### 1. Gmail OAuth Redirect URI
You need to update your Google Cloud Console OAuth settings:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to APIs & Services > Credentials
3. Edit your OAuth 2.0 Client ID
4. Add to Authorized redirect URIs:
   ```
   https://hashbase-production.up.railway.app/oauth2callback
   ```
5. Save changes

### 2. Build Arguments
The Dockerfile uses build arguments for Vite environment variables. Railway automatically passes environment variables as build args when they start with `VITE_`.

### 3. Database Connection
- Railway provides internal DNS: `postgres.railway.internal`
- Public access via TCP proxy: `caboose.proxy.rlwy.net:27447`
- The app uses internal DNS for better performance
- No SSL required for internal connections

---

## 📝 Railway CLI Commands Reference

### View Variables
```bash
railway variables                    # Pretty table format
railway variables --kv              # Key-value format
railway variables --json            # JSON format
```

### Set Variables
```bash
railway variables --set "KEY=value"
railway variables --set "KEY=value" --skip-deploys  # Don't trigger deployment
```

### Service Management
```bash
railway service                     # List and link services
railway service link <service>      # Link to specific service
```

### Deployment
```bash
railway up                          # Deploy and stream logs
railway up --detach                 # Deploy without streaming
railway logs                        # View logs
railway logs --tail 50              # View last 50 lines
```

### Database Access
```bash
railway run <command>               # Run command with Railway env vars
railway connect                     # Open database shell (if psql installed)
```

---

## 🔍 Monitoring & Debugging

### Check Deployment Status
```bash
railway status
```

### View Real-time Logs
```bash
railway logs
```

### Check Environment Variables
```bash
railway variables
```

### Access Railway Dashboard
```bash
railway open
```
Or visit: https://railway.com/project/b0af6d83-7dd3-4035-82ca-38a13717db73

---

## 🔄 Redeployment

Railway automatically redeploys when:
- You push to the connected GitHub repository
- You change environment variables (unless `--skip-deploys` is used)
- You run `railway up`

### Manual Redeploy
```bash
railway up --detach
```

---

## 🐛 Troubleshooting

### Database Connection Issues
If you see "Database not available":
1. Check DATABASE_URL is set: `railway variables | grep DATABASE_URL`
2. Verify Postgres service is running: `railway service link Postgres && railway status`
3. Check logs: `railway logs`

### Environment Variables Not Applied
If changes don't take effect:
1. Verify variables are set: `railway variables`
2. Trigger new deployment: `railway up --detach`
3. Check build logs for errors

### Gmail OAuth Not Working
1. Verify redirect URI in Google Cloud Console matches Railway URL
2. Check GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET are set
3. Ensure GMAIL_REDIRECT_URI uses HTTPS

---

## 📦 Files Added for Railway Deployment

- `Dockerfile` - Multi-stage build with Vite build args
- `docker-compose.yml` - Local development setup
- `init.sql` - Database schema initialization
- `migrate-railway.js` - Database migration script for Railway
- `.dockerignore` - Files to exclude from Docker build

---

## 🎉 Next Steps

1. ✅ Update Google OAuth redirect URI
2. ✅ Test the application at https://hashbase-production.up.railway.app
3. ✅ Configure widget API keys in the application settings
4. ✅ Set up custom domain (optional)
5. ✅ Configure monitoring and alerts in Railway dashboard

---

## 💡 Tips

- Use `railway open` to quickly access the Railway dashboard
- Set `--skip-deploys` when setting multiple variables to avoid multiple deployments
- Railway provides automatic HTTPS and SSL certificates
- Database backups are handled by Railway automatically
- Use Railway's metrics dashboard to monitor performance

---

## 🔐 Security Notes

- All sensitive credentials are stored as environment variables
- Database uses internal Railway network for security
- HTTPS is enforced by Railway
- OAuth tokens are encrypted with AES-256
- Database tokens persist across deployments

---

**Deployment Date:** March 30, 2026
**Deployed By:** Railway CLI v4.23.0
**Status:** ✅ Active and Healthy
