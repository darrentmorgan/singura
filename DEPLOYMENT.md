# SaaS X-Ray Frontend Deployment Guide

## Vercel Deployment

This guide covers deploying the SaaS X-Ray frontend to Vercel.

### Prerequisites

1. Vercel account (sign up at https://vercel.com)
2. Vercel CLI installed: `npm install -g vercel`
3. Clerk account with publishable key

### Project Structure

- **Root**: `/Users/darrenmorgan/AI_Projects/saas-xray`
- **Frontend**: `frontend/` (Vite + React + TypeScript)
- **Backend**: `backend/` (Node.js + Express) - NOT deployed to Vercel
- **Package Manager**: npm workspaces

### Configuration Files

#### vercel.json
Located at the root of the repository, this file:
- Configures build command to run from `frontend/` directory
- Sets output directory to `frontend/dist`
- Configures SPA routing (all routes → index.html)
- Adds security headers
- Configures asset caching

#### .vercelignore
Excludes backend, tests, and development files from deployment.

### Environment Variables

Set these in the Vercel dashboard (Project Settings → Environment Variables):

**Required:**
```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your-actual-clerk-key
```

**Optional:**
```bash
VITE_API_URL=https://your-backend-api.com
VITE_WS_URL=wss://your-backend-api.com
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_DEBUG_MODE=false
VITE_NODE_ENV=production
```

**Note**: For the initial deployment, the API_URL can be left empty or pointed to localhost (the backend will be deployed separately).

### Deployment Steps

#### Option 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from project root**:
   ```bash
   cd /Users/darrenmorgan/AI_Projects/saas-xray
   vercel
   ```

4. **Follow the prompts**:
   - Set up and deploy? **Y**
   - Which scope? Select your account/team
   - Link to existing project? **N** (first time)
   - Project name: **saas-xray** (or your preferred name)
   - Directory: **.** (root directory)
   - Override settings? **N** (vercel.json handles configuration)

5. **Add environment variables**:
   ```bash
   vercel env add VITE_CLERK_PUBLISHABLE_KEY production
   # Paste your Clerk publishable key when prompted
   ```

6. **Deploy to production**:
   ```bash
   vercel --prod
   ```

#### Option 2: Deploy via Vercel Dashboard

1. **Go to** https://vercel.com/new

2. **Import Git Repository**:
   - Connect GitHub account
   - Select repository: `darrentmorgan/saas-xray`

3. **Configure Project**:
   - Framework Preset: **Vite**
   - Root Directory: **.** (leave as is)
   - Build Command: `cd frontend && npm run build` (auto-detected from vercel.json)
   - Output Directory: `frontend/dist` (auto-detected from vercel.json)
   - Install Command: `npm install` (auto-detected)

4. **Add Environment Variables**:
   - Click "Environment Variables"
   - Add: `VITE_CLERK_PUBLISHABLE_KEY` = `your-clerk-key`
   - Environment: **Production**

5. **Deploy**:
   - Click "Deploy"
   - Wait for deployment to complete

### Post-Deployment Verification

1. **Check deployment URL**:
   - Vercel will provide a URL like `https://saas-xray-xxxxx.vercel.app`

2. **Verify functionality**:
   - Landing page loads correctly
   - Dark mode works
   - Cyan theme colors display properly
   - Navigation works (/, /login, /dashboard)
   - No console errors
   - Clerk authentication loads (sign-in modal appears)

3. **Test routing**:
   - Visit `/dashboard` directly - should load without 404
   - Browser back/forward buttons work
   - All links navigate correctly

4. **Performance check**:
   - Run Lighthouse audit
   - Check load times
   - Verify asset caching

### Custom Domain (Optional)

1. **Go to Project Settings** → **Domains**
2. **Add domain**: `yourdomain.com`
3. **Configure DNS** with your provider:
   - Add A record or CNAME as instructed by Vercel
4. **Wait for DNS propagation** (can take up to 48 hours)

### Clerk Configuration

After deployment, update Clerk dashboard:

1. **Go to** https://dashboard.clerk.com
2. **Select your application**
3. **Navigate to** "Paths" settings
4. **Add Vercel URL** to allowed origins:
   - Development: `http://localhost:4200`
   - Production: `https://your-vercel-url.vercel.app`

### Continuous Deployment

Vercel automatically deploys:
- **Production**: Pushes to `main` branch
- **Preview**: Pull requests and other branches

### Troubleshooting

#### Build fails with "tsc errors"
```bash
# Run locally to see TypeScript errors
cd frontend
npm run type-check

# Fix errors before deploying
```

#### Environment variables not working
- Ensure variables are prefixed with `VITE_`
- Redeploy after adding/changing environment variables
- Check Vercel dashboard → Project → Settings → Environment Variables

#### 404 on routes
- Verify `vercel.json` has SPA rewrite rules
- Check that `rewrites` configuration is present

#### Clerk authentication fails
- Verify `VITE_CLERK_PUBLISHABLE_KEY` is set
- Check Clerk dashboard allowed origins
- Verify CSP headers in index.html allow Clerk domains

#### Build command errors
- Ensure npm workspaces are properly configured
- Verify `shared-types` package builds successfully
- Check that all dependencies are in package.json

### Monitoring

- **Analytics**: Vercel dashboard provides analytics
- **Logs**: View function logs in Vercel dashboard
- **Alerts**: Configure deployment notifications

### Rollback

If a deployment has issues:

1. **Via CLI**:
   ```bash
   vercel rollback
   ```

2. **Via Dashboard**:
   - Go to Deployments
   - Find previous successful deployment
   - Click "..." → "Promote to Production"

### Production Best Practices

1. **Environment Variables**: Never commit `.env` files
2. **Security Headers**: Configured in `vercel.json`
3. **Asset Optimization**: Vite handles automatic code splitting
4. **Monitoring**: Set up Vercel Analytics
5. **Custom Domain**: Use custom domain for production
6. **SSL**: Automatic with Vercel
7. **CDN**: Automatic with Vercel Edge Network

### Backend Deployment (Separate)

Note: The backend (`backend/`) is NOT deployed to Vercel. For backend deployment:

- **Option 1**: Deploy to Railway, Render, or Fly.io
- **Option 2**: Deploy to AWS/GCP/Azure with Docker
- **Option 3**: Use Vercel Serverless Functions (requires refactoring)

After backend deployment, update frontend environment variables:
```bash
VITE_API_URL=https://your-backend-url.com
VITE_WS_URL=wss://your-backend-url.com
```

### Costs

- **Hobby Plan**: Free for personal projects
  - Unlimited deployments
  - 100GB bandwidth/month
  - Automatic SSL
  - Automatic previews

- **Pro Plan**: $20/month per user
  - More bandwidth
  - Advanced analytics
  - Password protection
  - Team collaboration

### Support

- **Vercel Documentation**: https://vercel.com/docs
- **Vercel Support**: https://vercel.com/support
- **Community**: https://github.com/vercel/vercel/discussions

### Next Steps

After successful frontend deployment:

1. Deploy backend to separate hosting platform
2. Update `VITE_API_URL` environment variable
3. Configure CORS on backend to allow Vercel domain
4. Set up custom domain
5. Configure monitoring and analytics
6. Set up deployment notifications
