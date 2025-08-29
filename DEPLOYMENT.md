# SaaS X-Ray Production Deployment Guide

This document provides comprehensive instructions for deploying SaaS X-Ray to production environments using Docker and Docker Compose.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Deployment Options](#deployment-options)
- [Production Deployment](#production-deployment)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)

## Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu 20.04+ recommended) or Docker-compatible OS
- **Memory**: Minimum 4GB RAM, 8GB+ recommended for production
- **Storage**: Minimum 20GB free space, SSD recommended
- **Network**: Stable internet connection for OAuth integrations

### Software Dependencies

- **Docker**: Version 24.0+ 
- **Docker Compose**: Version 2.20+
- **curl**: For health checks and API testing
- **git**: For code deployment

### Installation

```bash
# Install Docker (Ubuntu/Debian)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

## Environment Configuration

### 1. Copy Environment Template

```bash
cp .env.example .env.production
```

### 2. Generate Security Keys

Generate secure keys for your production environment:

```bash
# Generate JWT Secret (32+ characters)
openssl rand -base64 32

# Generate Encryption Key (exactly 32 characters)
openssl rand -base64 32

# Generate Session Secret (32+ characters)
openssl rand -base64 32
```

### 3. Configure OAuth Applications

#### Slack OAuth Setup
1. Visit [Slack API](https://api.slack.com/apps)
2. Create new app or use existing
3. Configure OAuth & Permissions:
   - Redirect URL: `https://yourdomain.com/api/auth/slack/callback`
   - Scopes: `identify`, `channels:read`, `users:read`
4. Copy Client ID and Client Secret to `.env.production`

#### Google OAuth Setup
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create project and enable APIs:
   - Google Workspace Admin SDK API
   - Google Drive API
   - Gmail API
3. Create OAuth 2.0 credentials:
   - Authorized redirect URI: `https://yourdomain.com/api/auth/google/callback`
4. Copy Client ID and Client Secret to `.env.production`

#### Microsoft OAuth Setup
1. Visit [Azure Portal](https://portal.azure.com/)
2. Register new application in Azure AD
3. Configure authentication:
   - Redirect URI: `https://yourdomain.com/api/auth/microsoft/callback`
   - API permissions: Microsoft Graph (required scopes)
4. Copy Application ID and Client Secret to `.env.production`

### 4. Database Configuration

Update database credentials in `.env.production`:

```env
DB_NAME=saasxray_prod
DB_USER=saasxray_prod
DB_PASSWORD=your_very_secure_database_password
DATABASE_URL=postgresql://saasxray_prod:your_very_secure_database_password@postgres:5432/saasxray_prod
```

### 5. Production Environment Variables

Complete `.env.production` configuration:

```env
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com

# Security (use generated values)
JWT_SECRET=your_generated_jwt_secret
ENCRYPTION_KEY=your_generated_encryption_key
SESSION_SECRET=your_generated_session_secret

# OAuth (from your applications)
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret

# Production features
ENABLE_REAL_TIME=true
ENABLE_BACKGROUND_JOBS=true
ENABLE_AUDIT_LOGGING=true
LOG_LEVEL=warn
```

## Deployment Options

### Option 1: Quick Deployment (Recommended)

Use the automated deployment script:

```bash
# Make deploy script executable
chmod +x scripts/deploy.sh

# Deploy to production
npm run deploy:production

# Or deploy specific version
scripts/deploy.sh v1.0.0 .env.production
```

### Option 2: Manual Deployment

For more control over the deployment process:

```bash
# Build the Docker image
docker build -t saas-xray:latest .

# Start infrastructure services
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d postgres redis

# Wait for infrastructure to be ready (30-60 seconds)
sleep 60

# Start the application
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d saas-xray

# Check deployment status
docker-compose -f docker-compose.prod.yml ps
```

### Option 3: Step-by-Step Deployment

For debugging or customization:

```bash
# 1. Pull base images
docker-compose -f docker-compose.prod.yml pull postgres redis

# 2. Build application
npm run docker:prod:build

# 3. Start database
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d postgres
docker-compose -f docker-compose.prod.yml logs postgres

# 4. Start Redis
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d redis
docker-compose -f docker-compose.prod.yml logs redis

# 5. Start application
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d saas-xray
docker-compose -f docker-compose.prod.yml logs -f saas-xray
```

## Production Deployment

### SSL/TLS Configuration

For production deployments, configure SSL/TLS termination:

#### Option 1: Nginx Reverse Proxy

Create `nginx/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream saas_xray {
        server saas-xray:3001;
    }

    server {
        listen 80;
        server_name yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com;

        ssl_certificate /etc/nginx/certs/fullchain.pem;
        ssl_certificate_key /etc/nginx/certs/privkey.pem;

        location / {
            proxy_pass http://saas_xray;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /socket.io/ {
            proxy_pass http://saas_xray;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }
}
```

Enable Nginx in production:

```bash
docker-compose -f docker-compose.prod.yml --profile production --env-file .env.production up -d
```

#### Option 2: Cloud Load Balancer

Configure your cloud provider's load balancer (AWS ALB, GCP Load Balancer, Azure Load Balancer) to terminate SSL and forward to the application container.

### Database Backup Strategy

Implement automated backups:

```bash
# Create backup script
cat > scripts/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U $DB_USER $DB_NAME | gzip > "$BACKUP_DIR/saasxray_$DATE.sql.gz"

# Cleanup old backups (keep 30 days)
find "$BACKUP_DIR" -name "saasxray_*.sql.gz" -mtime +30 -delete
EOF

chmod +x scripts/backup-db.sh

# Add to crontab for daily backups
echo "0 2 * * * /path/to/scripts/backup-db.sh" | crontab -
```

### Log Management

Configure log rotation and management:

```bash
# Configure Docker log driver
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "5"
  }
}
EOF

sudo systemctl restart docker
```

## Monitoring and Maintenance

### Health Checks

The application includes built-in health checks:

```bash
# Check application health
curl http://localhost:3001/health

# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f saas-xray
```

### Performance Monitoring

Monitor key metrics:

```bash
# Resource usage
docker stats

# Database connections
docker-compose -f docker-compose.prod.yml exec postgres psql -U $DB_USER $DB_NAME -c "SELECT count(*) FROM pg_stat_activity;"

# Redis memory usage
docker-compose -f docker-compose.prod.yml exec redis redis-cli info memory
```

### Updates and Maintenance

#### Application Updates

```bash
# Pull latest code
git pull origin main

# Deploy new version
npm run deploy:production
```

#### Database Maintenance

```bash
# Run migrations
docker-compose -f docker-compose.prod.yml exec saas-xray npm run migrate

# Vacuum database
docker-compose -f docker-compose.prod.yml exec postgres psql -U $DB_USER $DB_NAME -c "VACUUM ANALYZE;"
```

## Troubleshooting

### Common Issues

#### Application Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs saas-xray

# Check environment variables
docker-compose -f docker-compose.prod.yml exec saas-xray env | grep -E "(DATABASE_URL|REDIS_URL|JWT_SECRET)"

# Verify database connectivity
docker-compose -f docker-compose.prod.yml exec saas-xray nc -z postgres 5432
```

#### Database Connection Issues

```bash
# Check PostgreSQL status
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres

# Test connection manually
docker-compose -f docker-compose.prod.yml exec postgres psql -U $DB_USER $DB_NAME
```

#### OAuth Authentication Issues

1. Verify redirect URIs match exactly
2. Check OAuth application status in respective platforms
3. Verify client credentials are correctly set
4. Check application logs for specific OAuth errors

### Performance Issues

#### High Memory Usage

```bash
# Check memory usage
docker stats --no-stream

# Restart services if needed
docker-compose -f docker-compose.prod.yml restart saas-xray
```

#### Database Performance

```bash
# Check slow queries
docker-compose -f docker-compose.prod.yml exec postgres psql -U $DB_USER $DB_NAME -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Check database size
docker-compose -f docker-compose.prod.yml exec postgres psql -U $DB_USER $DB_NAME -c "\l+"
```

### Emergency Procedures

#### Rollback Deployment

```bash
# Stop current deployment
docker-compose -f docker-compose.prod.yml down

# Restore from backup (if available)
BACKUP_PATH=$(cat .last_backup)
docker-compose -f docker-compose.prod.yml up -d postgres
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U $DB_USER $DB_NAME < "$BACKUP_PATH/database.sql"

# Restart previous version
docker-compose -f docker-compose.prod.yml up -d
```

#### Scale for High Load

```bash
# Scale application containers
docker-compose -f docker-compose.prod.yml up -d --scale saas-xray=3

# Add load balancer configuration
# (Configure your load balancer to distribute traffic across containers)
```

## Security Considerations

### Network Security

- Use private networks for inter-service communication
- Implement firewall rules to restrict access
- Use SSL/TLS for all external communications
- Regularly update base images and dependencies

### Data Security

- Encrypt data at rest and in transit
- Implement proper access controls
- Regular security audits and penetration testing
- Monitor for suspicious activities

### Secrets Management

- Use environment variables for sensitive data
- Consider using a secrets management service (AWS Secrets Manager, Azure Key Vault, etc.)
- Rotate secrets regularly
- Never commit secrets to version control

### Compliance

- Implement audit logging
- Configure data retention policies
- Document data handling procedures
- Regular compliance assessments

## Support

For additional support:

1. Check logs: `docker-compose -f docker-compose.prod.yml logs`
2. Review health status: `curl http://localhost:3001/health`
3. Consult application documentation
4. Contact technical support team

---

**Note**: This deployment guide assumes familiarity with Docker, Docker Compose, and basic system administration. For complex production environments, consider consulting with DevOps specialists.