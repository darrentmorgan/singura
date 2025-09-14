# SaaS X-Ray Cloud Deployment Guide

This guide provides comprehensive instructions for deploying SaaS X-Ray to the cloud using Supabase + Vercel multi-environment architecture.

## Overview

SaaS X-Ray's cloud deployment consists of three environments:
- **Demo** (demo.saasxray.com) - Professional sales demonstrations
- **Staging** (staging.saasxray.com) - Customer beta testing
- **Production** (app.saasxray.com) - Enterprise customer deployments

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Multi-Environment Architecture               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Demo Env      │  │  Staging Env    │  │ Production Env  │ │
│  │                 │  │                 │  │                 │ │
│  │ Frontend        │  │ Frontend        │  │ Frontend        │ │
│  │ Vercel          │  │ Vercel          │  │ Vercel          │ │
│  │ demo.saasxray   │  │ staging.saasxray│  │ app.saasxray    │ │
│  │                 │  │                 │  │                 │ │
│  │ Backend         │  │ Backend         │  │ Backend         │ │
│  │ Supabase        │  │ Supabase        │  │ Supabase        │ │
│  │ Edge Functions  │  │ Edge Functions  │  │ Edge Functions  │ │
│  │                 │  │                 │  │                 │ │
│  │ Database        │  │ Database        │  │ Database        │ │
│  │ PostgreSQL      │  │ PostgreSQL      │  │ PostgreSQL      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

### Required Tools

1. **Node.js 20+** with npm
2. **Supabase CLI** - `npm install -g supabase`
3. **Vercel CLI** - `npm install -g vercel`
4. **Docker** (for local development and migration)

### Required Accounts

1. **Supabase Account** with 3 projects (demo, staging, production)
2. **Vercel Account** with deployment permissions
3. **GitHub Account** for CI/CD workflows

### Domain Configuration

Ensure you have control over these domains:
- `demo.saasxray.com`
- `staging.saasxray.com`
- `app.saasxray.com`

## Step-by-Step Deployment

### 1. Environment Setup

#### Create Supabase Projects

1. **Demo Project**
   ```bash
   # Create new Supabase project for demo
   supabase projects create saas-xray-demo --region us-east-1
   ```

2. **Staging Project**
   ```bash
   # Create new Supabase project for staging
   supabase projects create saas-xray-staging --region us-east-1
   ```

3. **Production Project**
   ```bash
   # Create new Supabase project for production
   supabase projects create saas-xray-production --region us-east-1
   ```

#### Configure Environment Variables

1. **Update `.env.demo`**
   ```bash
   # Copy and update with your demo project credentials
   cp .env.demo .env.demo.local
   # Edit .env.demo.local with actual values
   ```

2. **Update `.env.staging`**
   ```bash
   # Copy and update with your staging project credentials
   cp .env.staging .env.staging.local
   # Edit .env.staging.local with actual values
   ```

3. **Update `.env.production`**
   ```bash
   # Copy and update with your production project credentials
   cp .env.production .env.production.local
   # Edit .env.production.local with actual values
   ```

### 2. Database Migration

#### Migrate from Local PostgreSQL to Supabase

1. **Start Local Containers**
   ```bash
   # Ensure local development environment is running
   docker compose up -d postgres redis
   ```

2. **Migrate Demo Environment**
   ```bash
   ./scripts/migrate-to-supabase.sh demo
   ```

3. **Migrate Staging Environment**
   ```bash
   ./scripts/migrate-to-supabase.sh staging --skip-data
   ```

4. **Migrate Production Environment**
   ```bash
   ./scripts/migrate-to-supabase.sh production --skip-data
   ```

### 3. OAuth Configuration

Update OAuth redirect URIs in each platform:

#### Slack OAuth

1. Go to [Slack API Applications](https://api.slack.com/apps)
2. Update redirect URLs:
   - Demo: `https://demo.saasxray.com/oauth/slack/callback`
   - Staging: `https://staging.saasxray.com/oauth/slack/callback`
   - Production: `https://app.saasxray.com/oauth/slack/callback`

#### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to APIs & Services > Credentials
3. Update authorized redirect URIs:
   - Demo: `https://demo.saasxray.com/oauth/google/callback`
   - Staging: `https://staging.saasxray.com/oauth/google/callback`
   - Production: `https://app.saasxray.com/oauth/google/callback`

#### Microsoft OAuth

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to Azure Active Directory > App registrations
3. Update redirect URIs:
   - Demo: `https://demo.saasxray.com/oauth/microsoft/callback`
   - Staging: `https://staging.saasxray.com/oauth/microsoft/callback`
   - Production: `https://app.saasxray.com/oauth/microsoft/callback`

### 4. Manual Deployment

#### Deploy Demo Environment

```bash
./scripts/deploy-cloud.sh demo
```

#### Deploy Staging Environment

```bash
./scripts/deploy-cloud.sh staging --skip-seed
```

#### Deploy Production Environment

```bash
./scripts/deploy-cloud.sh production --skip-seed --force
```

### 5. Automated Deployment (CI/CD)

#### GitHub Secrets Configuration

Add the following secrets to your GitHub repository:

**Supabase Secrets:**
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DEMO_PROJECT_REF`
- `SUPABASE_STAGING_PROJECT_REF`
- `SUPABASE_PRODUCTION_PROJECT_REF`

**Vercel Secrets:**
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

**Environment-Specific Secrets:**
- `VITE_SUPABASE_URL_DEMO`
- `VITE_SUPABASE_ANON_KEY_DEMO`
- `VITE_SUPABASE_URL_STAGING`
- `VITE_SUPABASE_ANON_KEY_STAGING`
- `VITE_SUPABASE_URL_PRODUCTION`
- `VITE_SUPABASE_ANON_KEY_PRODUCTION`

#### Trigger Automated Deployment

1. **Demo Environment** - Push to `main` branch
2. **Staging Environment** - Push to `staging` branch
3. **Production Environment** - Push to `production` branch
4. **Manual Deployment** - Use GitHub Actions workflow dispatch

## Environment-Specific Features

### Demo Environment

- **Purpose**: Professional sales demonstrations
- **Features**:
  - Curated automation scenarios
  - Demo company data (Acme Corporation)
  - Professional domain (demo.saasxray.com)
  - SSL certificates
- **Data**: Pre-seeded with realistic enterprise scenarios
- **Reset**: Optional auto-reset functionality

### Staging Environment

- **Purpose**: Customer beta testing
- **Features**:
  - Real OAuth integration testing
  - Customer feedback collection
  - Usage analytics
  - Beta feature flags
- **Data**: Customer test data (isolated per customer)
- **Monitoring**: Enhanced error reporting and analytics

### Production Environment

- **Purpose**: Enterprise customer production deployments
- **Features**:
  - Full enterprise feature set
  - Multi-tenant architecture
  - Advanced security and compliance
  - Comprehensive audit logging
- **Data**: Customer production data with full encryption
- **SLA**: Production-level monitoring and alerting

## Post-Deployment Configuration

### 1. Domain Setup

Configure DNS records for each environment:

```dns
# Demo Environment
demo.saasxray.com CNAME cname.vercel-dns.com

# Staging Environment
staging.saasxray.com CNAME cname.vercel-dns.com

# Production Environment
app.saasxray.com CNAME cname.vercel-dns.com
```

### 2. SSL Certificates

Vercel automatically provisions SSL certificates for custom domains. Verify:

1. Visit each environment URL
2. Check for valid SSL certificate
3. Verify HTTPS redirects work properly

### 3. Performance Optimization

#### Vercel Edge Network

- Global CDN automatically enabled
- Static assets cached at edge locations
- Dynamic content optimized for fastest response

#### Supabase Performance

- Connection pooling enabled
- Database indexes optimized
- Real-time subscriptions configured

### 4. Monitoring Setup

#### Health Checks

Each environment exposes health check endpoints:

```bash
# Demo
curl https://demo.saasxray.com/api/health

# Staging
curl https://staging.saasxray.com/api/health

# Production
curl https://app.saasxray.com/api/health
```

#### Analytics Integration

1. **Vercel Analytics** - Automatic performance monitoring
2. **Supabase Analytics** - Database performance insights
3. **Custom Monitoring** - Application-specific metrics

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors

**Symptom**: 500 errors on API calls
**Solution**:
```bash
# Verify database connectivity
supabase projects list
supabase db push
```

#### 2. OAuth Redirect Errors

**Symptom**: OAuth flows fail with redirect URI mismatch
**Solution**: Update OAuth provider configurations with correct domains

#### 3. Build Failures

**Symptom**: Vercel deployment fails
**Solution**:
```bash
# Test build locally
npm run build:shared-types
npm run build:frontend
```

#### 4. CORS Errors

**Symptom**: Frontend cannot connect to API
**Solution**: Verify CORS configuration in Supabase Edge Functions

### Rollback Procedures

#### Frontend Rollback

```bash
# Revert to previous Vercel deployment
vercel rollback [deployment-url] --token=$VERCEL_TOKEN
```

#### Database Rollback

```bash
# Rollback database migration
supabase db reset --linked
# Re-apply previous migration
supabase db push --include-migrations=001
```

## Security Considerations

### Environment Isolation

- Each environment has isolated databases
- Separate OAuth applications
- Environment-specific API keys
- Isolated user data

### Data Encryption

- All data encrypted in transit (HTTPS/WSS)
- Database encryption at rest (Supabase)
- OAuth tokens encrypted in database
- Environment variables secured

### Access Controls

- Row Level Security (RLS) enabled
- Environment-specific access policies
- Multi-tenant data isolation
- Audit logging for all access

## Scaling Considerations

### Database Scaling

- Supabase auto-scaling enabled
- Connection pooling configured
- Read replicas available for production
- Automated backups and point-in-time recovery

### Frontend Scaling

- Vercel Edge Network global distribution
- Automatic scaling based on traffic
- CDN caching for static assets
- Serverless functions for dynamic content

### Monitoring and Alerting

- Real-time performance monitoring
- Automated error alerting
- Capacity planning and forecasting
- SLA monitoring and reporting

## Maintenance

### Regular Tasks

1. **Weekly**: Review deployment logs and performance metrics
2. **Monthly**: Update dependencies and security patches
3. **Quarterly**: Review and optimize database performance
4. **Annually**: Audit security configurations and access controls

### Backup Procedures

#### Database Backups

```bash
# Manual backup
supabase db dump --linked > backup-$(date +%Y%m%d).sql
```

#### Configuration Backups

```bash
# Backup environment configurations
cp .env.* backups/config/
```

## Cost Optimization

### Supabase Usage

- Monitor database usage and optimize queries
- Use appropriate instance sizes
- Enable automatic scaling policies
- Regular cleanup of old data

### Vercel Usage

- Optimize build processes
- Minimize function execution time
- Use edge caching effectively
- Monitor bandwidth usage

## Support and Resources

### Documentation Links

- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [SaaS X-Ray Architecture Guide](./architecture.md)

### Getting Help

1. Check deployment logs in Vercel dashboard
2. Review Supabase project logs
3. Use GitHub Issues for bug reports
4. Contact support for enterprise customers

---

**Congratulations!** You have successfully deployed SaaS X-Ray to the cloud with a professional multi-environment architecture. Your revolutionary GPT-5-powered Shadow Network Detection System is now ready for enterprise customer acquisition!