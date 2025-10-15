# Docker Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Install [Docker Desktop](https://www.docker.com/products/docker-desktop) (includes Docker Compose)

### Setup Steps

```bash
# 1. Clone and navigate
git clone <repository-url>
cd hashbase

# 2. Configure environment
cp .env.example .env
# Edit .env with your API credentials

# 3. Generate encryption key
node generate-encryption-key.js
# Copy the output to your .env file

# 4. Start the application
docker-compose up -d

# 5. Open browser
# Navigate to http://localhost:5000
```

---

## 📋 Essential Commands

| Action | Command |
|--------|---------|
| **Start** | `docker-compose up -d` |
| **Stop** | `docker-compose down` |
| **View Logs** | `docker-compose logs -f` |
| **Restart** | `docker-compose restart` |
| **Rebuild** | `docker-compose up -d --build` |
| **Status** | `docker-compose ps` |
| **Shell Access** | `docker-compose exec hashbase sh` |

---

## 🔧 Configuration

### Required Environment Variables

Edit `.env` file:

```env
# Gmail API (required for Gmail widget)
GMAIL_CLIENT_ID=your_client_id_here
GMAIL_CLIENT_SECRET=your_client_secret_here
GMAIL_REDIRECT_URI=http://localhost:5000/oauth2callback

# Config Encryption (required)
VITE_CONFIG_ENCRYPTION_KEY=your_64_character_hex_key_here

# News API (optional)
NEWS_API_KEY=your_news_api_key_here
```

### Other Services (Configure in-app)
- **Netlify** → Settings > Secrets
- **OpenAI** → Settings > Secrets
- **Claude** → Settings > Secrets
- **GitHub** → Settings > Secrets
- **Tavily** → Settings > Secrets

---

## 🐛 Quick Troubleshooting

### Container won't start?
```bash
docker-compose logs hashbase
```

### Port 5000 already in use?
Edit `docker-compose.yml`:
```yaml
ports:
  - "8080:5000"  # Change 8080 to any available port
```

### Gmail auth not working?
1. Check `.env` has correct credentials
2. Verify redirect URI: `http://localhost:5000/oauth2callback`
3. Restart: `docker-compose restart`

### Need to rebuild?
```bash
docker-compose down
docker-compose up -d --build
```

---

## 📚 Full Documentation

- **Complete Docker Guide:** [DOCKER_SETUP.md](./DOCKER_SETUP.md)
- **Application Guide:** [README.md](./README.md)
- **Widget Configuration:** See README.md

---

## 🎯 Quick Tips

✅ **Always use `-d` flag** to run in detached mode (background)

✅ **View logs** with `docker-compose logs -f` to debug issues

✅ **Restart after .env changes** with `docker-compose restart`

✅ **Clean rebuild** if things break:
```bash
docker-compose down
docker system prune -a  # Warning: removes all unused Docker data
docker-compose up -d --build
```

---

## 🌐 Access Points

- **Dashboard:** http://localhost:5000
- **Health Check:** http://localhost:5000/api/auth/status
- **Gmail Auth:** http://localhost:5000/api/auth/url

---

## 🔒 Security Notes

- Never commit `.env` file to version control
- Keep `VITE_CONFIG_ENCRYPTION_KEY` secure
- Use HTTPS in production
- Update OAuth redirect URIs for production domains

---

**Need more help?** See [DOCKER_SETUP.md](./DOCKER_SETUP.md) for detailed instructions, troubleshooting, and production deployment.
