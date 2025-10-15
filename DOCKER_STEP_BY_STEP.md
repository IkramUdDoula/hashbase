# Docker Setup - Complete Step-by-Step Guide

This guide walks you through setting up Hashbase Dashboard with Docker from scratch, with detailed explanations for beginners.

---

## 📋 Table of Contents

1. [Install Docker](#step-1-install-docker)
2. [Get the Code](#step-2-get-the-code)
3. [Configure API Keys](#step-3-configure-api-keys)
4. [Build and Run](#step-4-build-and-run)
5. [Verify Installation](#step-5-verify-installation)
6. [Configure Widgets](#step-6-configure-widgets)
7. [Daily Usage](#step-7-daily-usage)

---

## Step 1: Install Docker

### Windows

1. **Download Docker Desktop:**
   - Visit: https://www.docker.com/products/docker-desktop
   - Click "Download for Windows"
   - Run the installer (Docker Desktop Installer.exe)

2. **Install:**
   - Follow the installation wizard
   - Enable WSL 2 if prompted (recommended)
   - Restart your computer when prompted

3. **Verify Installation:**
   - Open PowerShell or Command Prompt
   - Run:
     ```powershell
     docker --version
     docker-compose --version
     ```
   - You should see version numbers (e.g., Docker version 24.0.0)

### Mac

1. **Download Docker Desktop:**
   - Visit: https://www.docker.com/products/docker-desktop
   - Choose your Mac chip (Intel or Apple Silicon)
   - Run the .dmg installer

2. **Install:**
   - Drag Docker to Applications folder
   - Open Docker from Applications
   - Follow the setup wizard

3. **Verify Installation:**
   - Open Terminal
   - Run:
     ```bash
     docker --version
     docker-compose --version
     ```

### Linux

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo apt-get install docker-compose-plugin

# Verify
docker --version
docker-compose --version
```

---

## Step 2: Get the Code

### Option A: Clone from Git

```bash
# Navigate to where you want the project
cd ~/Projects  # or C:\Dev on Windows

# Clone the repository
git clone <repository-url>
cd hashbase
```

### Option B: Download ZIP

1. Download the project ZIP file
2. Extract to your desired location
3. Open terminal/PowerShell in that folder

---

## Step 3: Configure API Keys

### 3.1 Create Environment File

```bash
# Copy the example file
cp .env.example .env

# Windows PowerShell alternative:
copy .env.example .env
```

### 3.2 Generate Encryption Key

This key encrypts your API secrets when you export configuration.

```bash
# Run the generator
node generate-encryption-key.js
```

**Output will look like:**
```
VITE_CONFIG_ENCRYPTION_KEY=cfcd868eeeecfe941addf4ca73214bbb25eaec2a635c292ba2223aeee297b7e0
```

**Copy the entire line** and paste it into your `.env` file.

### 3.3 Configure Gmail API (Required)

Gmail widget requires OAuth credentials from Google Cloud Console.

#### Step-by-Step Gmail Setup:

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/

2. **Create a Project:**
   - Click "Select a project" → "New Project"
   - Name it "Hashbase Dashboard"
   - Click "Create"

3. **Enable Gmail API:**
   - Go to "APIs & Services" → "Library"
   - Search for "Gmail API"
   - Click on it and click "Enable"

4. **Create OAuth Credentials:**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - If prompted, configure OAuth consent screen:
     - User Type: External
     - App name: Hashbase Dashboard
     - User support email: your email
     - Developer contact: your email
     - Click "Save and Continue" through the rest
   - Back to Create OAuth client ID:
     - Application type: Web application
     - Name: Hashbase Local
     - Authorized redirect URIs: `http://localhost:5000/oauth2callback`
     - Click "Create"

5. **Copy Credentials:**
   - You'll see a popup with Client ID and Client Secret
   - Copy both values

6. **Add to .env file:**
   ```env
   GMAIL_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
   GMAIL_CLIENT_SECRET=your_client_secret_here
   GMAIL_REDIRECT_URI=http://localhost:5000/oauth2callback
   ```

### 3.4 Configure News API (Optional)

For the News widget to work:

1. **Get API Key:**
   - Visit: https://newsapi.org/register
   - Sign up for free account (100 requests/day)
   - Copy your API key

2. **Add to .env:**
   ```env
   NEWS_API_KEY=your_news_api_key_here
   ```

### 3.5 Final .env File Example

Your `.env` should look like this:

```env
# Gmail API Credentials
GMAIL_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=GOCSPX-AbCdEfGhIjKlMnOpQrStUvWx
GMAIL_REDIRECT_URI=http://localhost:5000/oauth2callback

# News API Credentials
NEWS_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

# Frontend Configuration
VITE_FRONTEND_URL=http://localhost:5000

# Config Encryption Key
VITE_CONFIG_ENCRYPTION_KEY=cfcd868eeeecfe941addf4ca73214bbb25eaec2a635c292ba2223aeee297b7e0
```

---

## Step 4: Build and Run

### 4.1 Start Docker Desktop

- **Windows/Mac:** Open Docker Desktop application
- **Linux:** Docker daemon should be running automatically

### 4.2 Build and Start

Open terminal in the `hashbase` folder and run:

```bash
docker-compose up -d
```

**What this does:**
- `-d` = detached mode (runs in background)
- Builds the Docker image (first time only, takes 2-5 minutes)
- Starts the container
- Maps port 5000 to your computer

**Expected output:**
```
Creating network "hashbase-network" with the default driver
Building hashbase
...
Successfully built abc123def456
Successfully tagged hashbase:latest
Creating hashbase-dashboard ... done
```

### 4.3 Check Status

```bash
docker-compose ps
```

**Expected output:**
```
       Name                     Command               State           Ports
--------------------------------------------------------------------------------
hashbase-dashboard   npm run preview -- --host  ...   Up      0.0.0.0:5000->5000/tcp
```

Status should be "Up".

---

## Step 5: Verify Installation

### 5.1 Check Logs

```bash
docker-compose logs -f
```

**Look for:**
```
> hashbase@0.0.0 preview
> vite preview --host 0.0.0.0

  ➜  Local:   http://localhost:5000/
  ➜  Network: http://0.0.0.0:5000/
```

Press `Ctrl+C` to exit log view.

### 5.2 Open Dashboard

1. Open your web browser
2. Navigate to: `http://localhost:5000`
3. You should see the Hashbase Dashboard

### 5.3 Test Health Check

Visit: `http://localhost:5000/api/auth/status`

Should return: `{"authenticated":false}`

---

## Step 6: Configure Widgets

### 6.1 Gmail Widget

1. In the dashboard, find the Gmail widget
2. Click the "Login with Gmail" button
3. You'll be redirected to Google
4. Sign in and grant permissions
5. You'll be redirected back to the dashboard
6. Gmail widget should now show your unread emails

### 6.2 Other Widgets (In-App Configuration)

Click the **Settings** button (⚙️ icon) in the top-right corner:

#### Netlify Widget:
1. Go to Settings > Configuration > Secrets
2. Get token from: https://app.netlify.com/user/applications#personal-access-tokens
3. Paste into "Netlify Access Token"
4. Click "Save Secrets"

#### OpenAI (GPT) Widget:
1. Go to Settings > Configuration > Secrets
2. Get key from: https://platform.openai.com/api-keys
3. Paste into "OpenAI API Key"
4. Click "Save Secrets"

#### Claude Widget:
1. Go to Settings > Configuration > Secrets
2. Get key from: https://console.anthropic.com/settings/keys
3. Paste into "Claude API Key (Anthropic)"
4. Click "Save Secrets"

#### GitHub Widget:
1. Go to Settings > Configuration > Secrets
2. Get token from: https://github.com/settings/tokens
3. Select `repo` scope
4. Paste into "GitHub Personal Access Token"
5. Click "Save Secrets"
6. In GitHub widget, click settings icon to configure repository

#### Tavily (Web Search):
1. Go to Settings > Configuration > Secrets
2. Get key from: https://tavily.com
3. Paste into "Tavily API Key (Web Search)"
4. Click "Save Secrets"

---

## Step 7: Daily Usage

### Starting the Dashboard

```bash
# Navigate to project folder
cd hashbase

# Start
docker-compose up -d
```

### Stopping the Dashboard

```bash
# Stop (keeps data)
docker-compose down
```

### Viewing Logs

```bash
# Real-time logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100
```

### Restarting After Changes

If you modify `.env` file:

```bash
docker-compose restart
```

If you update the code:

```bash
docker-compose up -d --build
```

### Checking Status

```bash
# Container status
docker-compose ps

# Health check
docker inspect --format='{{.State.Health.Status}}' hashbase-dashboard
```

---

## 🎯 Quick Reference Card

### Essential Commands

| Task | Command |
|------|---------|
| Start | `docker-compose up -d` |
| Stop | `docker-compose down` |
| Restart | `docker-compose restart` |
| Logs | `docker-compose logs -f` |
| Status | `docker-compose ps` |
| Rebuild | `docker-compose up -d --build` |
| Shell | `docker-compose exec hashbase sh` |

### URLs

- **Dashboard:** http://localhost:5000
- **Health:** http://localhost:5000/api/auth/status

---

## 🐛 Common Issues

### "Port 5000 is already in use"

**Solution 1:** Stop the other application using port 5000

**Solution 2:** Change the port in `docker-compose.yml`:
```yaml
ports:
  - "8080:5000"  # Use port 8080 instead
```

Then update `.env`:
```env
VITE_FRONTEND_URL=http://localhost:8080
GMAIL_REDIRECT_URI=http://localhost:8080/oauth2callback
```

### "Cannot connect to Docker daemon"

**Windows/Mac:** Start Docker Desktop application

**Linux:**
```bash
sudo systemctl start docker
```

### Gmail Authentication Fails

1. Check `.env` has correct credentials
2. Verify redirect URI in Google Cloud Console: `http://localhost:5000/oauth2callback`
3. Restart container: `docker-compose restart`
4. Clear browser cache and try again

### Container Keeps Restarting

Check logs:
```bash
docker-compose logs hashbase
```

Common causes:
- Missing `.env` file
- Invalid environment variables
- Port conflict

---

## 📚 Next Steps

- **Full Docker Guide:** [DOCKER_SETUP.md](./DOCKER_SETUP.md)
- **Application Guide:** [README.md](./README.md)
- **Quick Reference:** [DOCKER_QUICKSTART.md](./DOCKER_QUICKSTART.md)

---

## ✅ Success Checklist

- [ ] Docker Desktop installed and running
- [ ] Project downloaded/cloned
- [ ] `.env` file created with credentials
- [ ] Encryption key generated and added
- [ ] Gmail API configured in Google Cloud Console
- [ ] Container started: `docker-compose up -d`
- [ ] Dashboard accessible at http://localhost:5000
- [ ] Gmail widget authenticated
- [ ] Other widgets configured as needed

**Congratulations! Your Hashbase Dashboard is now running in Docker! 🎉**
