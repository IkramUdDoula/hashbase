# Docker Setup Guide for Hashbase Dashboard

This guide will help you run the Hashbase Dashboard using Docker and Docker Compose.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Building and Running](#building-and-running)
- [Docker Commands Reference](#docker-commands-reference)
- [Troubleshooting](#troubleshooting)
- [Production Deployment](#production-deployment)

---

## Prerequisites

### Required Software
- **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
  - Download: https://www.docker.com/products/docker-desktop
  - Minimum version: Docker 20.10+
- **Docker Compose** (usually included with Docker Desktop)
  - Minimum version: 1.29+

### Verify Installation
```bash
docker --version
docker-compose --version
```

Expected output:
```
Docker version 24.0.0 or higher
Docker Compose version 1.29.0 or higher
```

---

## Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd hashbase
```

### 2. Configure Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and add your API credentials:

**Required:**
```env
# Gmail API (required for Gmail widget)
GMAIL_CLIENT_ID=your_client_id_here
GMAIL_CLIENT_SECRET=your_client_secret_here
GMAIL_REDIRECT_URI=http://localhost:5000/oauth2callback

# Config Encryption Key (required for config export/import)
VITE_CONFIG_ENCRYPTION_KEY=your_64_character_hex_key_here
```

**Optional:**
```env
# News API (optional - for News widget)
NEWS_API_KEY=your_news_api_key_here

# Frontend URL (defaults to http://localhost:5000)
VITE_FRONTEND_URL=http://localhost:5000
```

**Generate Encryption Key:**
```bash
node generate-encryption-key.js
```

### 3. Build and Run with Docker Compose

**Start the application:**
```bash
docker-compose up -d
```

This will:
- Build the Docker image
- Start the container in detached mode
- Map port 5000 to your host machine

**View logs:**
```bash
docker-compose logs -f
```

### 4. Access the Dashboard

Open your browser and navigate to:
```
http://localhost:5000
```

---

## Configuration

### Environment Variables

The application uses environment variables from your `.env` file. Docker Compose automatically loads them.

**Gmail API Setup:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project and enable Gmail API
3. Create OAuth 2.0 credentials
4. Add redirect URI: `http://localhost:5000/oauth2callback`
5. Copy Client ID and Secret to `.env`

**Other API Keys:**
Most other services (Netlify, OpenAI, Claude, GitHub) are configured in-app via Settings > Secrets.

### Port Configuration

By default, the app runs on port 5000. To change it:

**Edit `docker-compose.yml`:**
```yaml
ports:
  - "8080:5000"  # Maps host port 8080 to container port 5000
```

**Update `.env`:**
```env
VITE_FRONTEND_URL=http://localhost:8080
GMAIL_REDIRECT_URI=http://localhost:8080/oauth2callback
```

---

## Building and Running

### Using Docker Compose (Recommended)

**Start the application:**
```bash
docker-compose up -d
```

**Stop the application:**
```bash
docker-compose down
```

**Rebuild after code changes:**
```bash
docker-compose up -d --build
```

**View logs:**
```bash
docker-compose logs -f hashbase
```

**Restart the container:**
```bash
docker-compose restart
```

### Using Docker CLI (Manual)

**Build the image:**
```bash
docker build -t hashbase:latest .
```

**Run the container:**
```bash
docker run -d \
  --name hashbase-dashboard \
  -p 5000:5000 \
  --env-file .env \
  hashbase:latest
```

**Stop the container:**
```bash
docker stop hashbase-dashboard
```

**Remove the container:**
```bash
docker rm hashbase-dashboard
```

---

## Docker Commands Reference

### Container Management

| Command | Description |
|---------|-------------|
| `docker-compose up -d` | Start containers in detached mode |
| `docker-compose down` | Stop and remove containers |
| `docker-compose restart` | Restart containers |
| `docker-compose stop` | Stop containers without removing |
| `docker-compose start` | Start stopped containers |
| `docker-compose ps` | List running containers |

### Logs and Debugging

| Command | Description |
|---------|-------------|
| `docker-compose logs -f` | Follow logs in real-time |
| `docker-compose logs --tail=100` | Show last 100 log lines |
| `docker-compose exec hashbase sh` | Open shell in container |
| `docker-compose exec hashbase npm run dev` | Run dev mode in container |

### Image Management

| Command | Description |
|---------|-------------|
| `docker-compose build` | Build/rebuild images |
| `docker-compose build --no-cache` | Build without cache |
| `docker images` | List all images |
| `docker rmi hashbase:latest` | Remove image |

### Health Check

```bash
# Check container health status
docker inspect --format='{{.State.Health.Status}}' hashbase-dashboard

# View health check logs
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' hashbase-dashboard
```

---

## Troubleshooting

### Container Won't Start

**Check logs:**
```bash
docker-compose logs hashbase
```

**Common issues:**
- Missing `.env` file → Copy `.env.example` to `.env`
- Port 5000 already in use → Change port in `docker-compose.yml`
- Invalid environment variables → Check `.env` syntax

### Port Already in Use

**Find process using port 5000:**
```bash
# Windows
netstat -ano | findstr :5000

# Linux/Mac
lsof -i :5000
```

**Solution 1:** Stop the conflicting process

**Solution 2:** Change the port in `docker-compose.yml`:
```yaml
ports:
  - "8080:5000"
```

### Gmail Authentication Not Working

**Verify redirect URI:**
1. Check `.env` file: `GMAIL_REDIRECT_URI=http://localhost:5000/oauth2callback`
2. Check Google Cloud Console OAuth settings match exactly
3. Restart container: `docker-compose restart`

### Application Not Accessible

**Check container status:**
```bash
docker-compose ps
```

**Check if port is mapped correctly:**
```bash
docker port hashbase-dashboard
```

**Test from inside container:**
```bash
docker-compose exec hashbase wget -O- http://localhost:5000
```

### Build Failures

**Clear Docker cache and rebuild:**
```bash
docker-compose down
docker system prune -a
docker-compose up -d --build
```

### Out of Memory

**Increase Docker memory limit:**
- Docker Desktop → Settings → Resources → Memory
- Increase to at least 4GB

**Or adjust in `docker-compose.yml`:**
```yaml
deploy:
  resources:
    limits:
      memory: 1G
```

---

## Production Deployment

### Security Considerations

**1. Use HTTPS:**
- Set up a reverse proxy (nginx, Traefik, Caddy)
- Obtain SSL certificate (Let's Encrypt)
- Update redirect URIs to use `https://`

**2. Secure Environment Variables:**
- Use Docker secrets or external secret management
- Never commit `.env` to version control
- Rotate API keys regularly

**3. Update OAuth Redirect URIs:**
```env
GMAIL_REDIRECT_URI=https://yourdomain.com/oauth2callback
VITE_FRONTEND_URL=https://yourdomain.com
```

### Example Production docker-compose.yml

```yaml
version: '3.8'

services:
  hashbase:
    image: hashbase:latest
    container_name: hashbase-prod
    restart: always
    ports:
      - "5000:5000"
    env_file:
      - .env.production
    networks:
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.hashbase.rule=Host(`yourdomain.com`)"
      - "traefik.http.routers.hashbase.tls=true"
      - "traefik.http.routers.hashbase.tls.certresolver=letsencrypt"

networks:
  web:
    external: true
```

### Reverse Proxy with Nginx

**nginx.conf:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Docker Hub Deployment

**Build and tag:**
```bash
docker build -t yourusername/hashbase:latest .
```

**Push to Docker Hub:**
```bash
docker login
docker push yourusername/hashbase:latest
```

**Pull and run on server:**
```bash
docker pull yourusername/hashbase:latest
docker run -d -p 5000:5000 --env-file .env yourusername/hashbase:latest
```

---

## Performance Optimization

### Multi-stage Build Benefits
- Smaller image size (~200MB vs ~800MB)
- Faster deployments
- Only production dependencies included

### Resource Limits
Adjust based on your needs in `docker-compose.yml`:
```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 1G
    reservations:
      cpus: '1'
      memory: 512M
```

### Caching
The Dockerfile uses layer caching to speed up builds:
- Dependencies cached separately from source code
- Only rebuilds when `package.json` changes

---

## Additional Resources

- **Docker Documentation:** https://docs.docker.com/
- **Docker Compose Documentation:** https://docs.docker.com/compose/
- **Hashbase README:** [README.md](./README.md)
- **Gmail API Setup:** [Google Cloud Console](https://console.cloud.google.com/)

---

## Support

If you encounter issues:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review container logs: `docker-compose logs -f`
3. Verify `.env` configuration
4. Check the main [README.md](./README.md) for widget-specific setup

---

## Summary

**Quick Commands:**
```bash
# Start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Rebuild
docker-compose up -d --build

# Shell access
docker-compose exec hashbase sh
```

**Access:** http://localhost:5000

**Health Check:** http://localhost:5000/api/auth/status
