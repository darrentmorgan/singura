---
name: dev-server-startup
description: Guide for starting Singura's development servers (frontend and backend) with proper port management, Docker service verification, and health checks. Use this skill when you need to start the full development environment.
---

# Development Server Startup for Singura

This skill provides a reliable workflow for starting Singura's frontend and backend development servers with all required dependencies.

## When to Use This Skill

Use dev-server-startup when you need to:
- Start the full Singura development environment
- Verify all services are running properly
- Troubleshoot server startup issues
- Reset the development environment

**Do NOT use for**: Production deployments (use deployment guides instead).

## Server Configuration

### Backend Server
- **Port**: 4201
- **Command**: `npm run dev` (in backend/)
- **Script**: Uses `ts-node src/simple-server.ts`
- **Health Check**: http://localhost:4201/api/health
- **Dependencies**: PostgreSQL (5433), Redis (6379)

### Frontend Server
- **Port**: 4200
- **Command**: `npm run dev` (in frontend/)
- **Tool**: Vite development server
- **URL**: http://localhost:4200
- **API Target**: http://localhost:4201

### Supporting Services (Docker)
- **PostgreSQL**: Port 5433 (mapped from 5432)
- **Redis**: Port 6379
- **Start Command**: `docker compose up -d postgres redis`

## Startup Workflow

### Step 1: Verify Docker Services

Check if PostgreSQL and Redis are running:

```bash
docker ps --filter "name=postgres" --filter "name=redis" --format "{{.Names}} - {{.Status}}"
```

**Expected Output**:
```
singura-redis-1 - Up X days (healthy)
singura-postgres-1 - Up X days (healthy)
```

**If NOT running**, start them:
```bash
docker compose up -d postgres redis
```

**Wait 5 seconds** for services to initialize:
```bash
sleep 5
```

### Step 2: Check Port Availability

Check if ports 4200 and 4201 are free:

```bash
lsof -ti:4200 -ti:4201 2>/dev/null || echo "Ports are free"
```

**If processes found**, kill them:
```bash
# Kill processes on port 4200
lsof -ti:4200 | xargs kill -9 2>/dev/null

# Kill processes on port 4201
lsof -ti:4201 | xargs kill -9 2>/dev/null
```

### Step 3: Start Backend Server

Start the backend in the background:

```bash
cd backend && npm run dev
```

**Use background mode** to keep terminal free:
- In bash tools: Use `run_in_background: true` parameter
- Save the Bash ID for later (to check logs or stop)

**Wait 3 seconds** for backend to initialize:
```bash
sleep 3
```

**Verify backend health**:
```bash
curl -s http://localhost:4201/api/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-30T09:09:42.628Z",
  "environment": "development",
  "version": "1.0.0"
}
```

### Step 4: Start Frontend Server

Start the frontend in the background:

```bash
cd frontend && npm run dev
```

**Use background mode** to keep terminal free:
- In bash tools: Use `run_in_background: true` parameter
- Save the Bash ID for later (to check logs or stop)

**Wait 3 seconds** for Vite to initialize:
```bash
sleep 3
```

**Verify frontend is serving**:
```bash
curl -s -I http://localhost:4200
```

**Expected Response**:
```
HTTP/1.1 200 OK
Content-Type: text/html
```

### Step 5: Final Verification

Check that both servers are responding:

```bash
# Backend health
curl -s http://localhost:4201/api/health | jq .status

# Frontend status code
curl -s -o /dev/null -w "%{http_code}" http://localhost:4200
```

**Expected**:
- Backend: `"healthy"`
- Frontend: `200`

## Success Indicators

You've successfully started the development environment when:

1. ✅ Docker services show "healthy" status
2. ✅ Backend health check returns `{"status":"healthy"}`
3. ✅ Frontend returns HTTP 200
4. ✅ Backend logs show:
   - `🚀 SaaS X-Ray Backend running on port 4201`
   - `🔗 CORS origin: http://localhost:4200`
   - `Redis client connected`
5. ✅ Frontend logs show:
   - `VITE v5.x.x ready in XXXms`
   - `➜ Local: http://localhost:4200/`

## Common Issues & Solutions

### Issue 1: Port Already in Use

**Symptom**: `Error: listen EADDRINUSE: address already in use :::4200`

**Solution**:
```bash
# Find and kill process on port
lsof -ti:4200 | xargs kill -9
# Or kill by name
pkill -f "vite"
pkill -f "ts-node"
```

### Issue 2: Docker Services Not Running

**Symptom**: Backend shows database connection errors

**Solution**:
```bash
# Start Docker services
docker compose up -d postgres redis

# Check status
docker ps

# View logs if issues
docker compose logs postgres
docker compose logs redis
```

### Issue 3: Backend Fails to Start

**Symptom**: Backend crashes on startup

**Check**:
1. Database migrations applied:
   ```bash
   cd backend && npm run migrate:status
   ```
2. Environment variables set:
   ```bash
   grep -E "DATABASE_URL|CLERK_SECRET_KEY" backend/.env
   ```
3. Node version >= 20:
   ```bash
   node --version
   ```

### Issue 4: Frontend Can't Connect to Backend

**Symptom**: Frontend shows API connection errors

**Check**:
1. Backend is running on 4201:
   ```bash
   curl http://localhost:4201/api/health
   ```
2. CORS is configured correctly (backend should show):
   ```
   🔗 CORS origin: http://localhost:4200
   ```

## Managing Running Servers

### Check Server Output

```bash
# Get output from background processes
# Use the Bash ID returned when started
BashOutput tool with bash_id: <ID>
```

### Stop Servers

```bash
# Kill specific background process
KillShell tool with shell_id: <ID>

# Or kill all node processes (nuclear option)
pkill -f "node"
```

### Restart Servers

```bash
# Kill existing processes
lsof -ti:4200 -ti:4201 | xargs kill -9

# Start fresh following Step 3-4 above
```

## Environment-Specific Notes

### Development (.env.development)
- Backend: http://localhost:4201
- Frontend: http://localhost:4200
- Hot reload enabled on both servers

### Production
- **DO NOT use this skill** - Use deployment guides
- Backend: Uses `npm start` with compiled JS
- Frontend: Uses static build with `npm run build`

## Integration with Other Skills

### Before Using This Skill

1. Ensure `.env` files are configured:
   - `backend/.env` with DATABASE_URL, CLERK_SECRET_KEY, etc.
   - `frontend/.env` with VITE_API_URL, VITE_CLERK_PUBLISHABLE_KEY

2. Install dependencies (if first time):
   ```bash
   cd backend && npm install
   cd frontend && npm install
   ```

### After Starting Servers

- Use **webapp-testing** skill for E2E testing
- Use **Chrome DevTools MCP** for browser automation
- Access frontend at http://localhost:4200

## Quick Start Command Summary

```bash
# Complete startup sequence
docker compose up -d postgres redis && \
sleep 5 && \
cd backend && npm run dev &
BACKEND_PID=$! && \
sleep 3 && \
cd ../frontend && npm run dev &
FRONTEND_PID=$! && \
sleep 3 && \
curl -s http://localhost:4201/api/health && \
curl -s -I http://localhost:4200 | head -1
```

**Note**: Use background mode with Bash tools instead of `&` when using Claude Code.

## Verification Checklist

After startup, verify:

- [ ] Docker PostgreSQL healthy
- [ ] Docker Redis healthy
- [ ] Backend responds to /api/health
- [ ] Backend logs show no errors
- [ ] Frontend serves on port 4200
- [ ] Frontend logs show Vite ready
- [ ] Can access http://localhost:4200 in browser
- [ ] Backend logs show Socket.io enabled
- [ ] Backend logs show Redis connected

## Next Steps After Startup

1. **Test OAuth flows**: Visit http://localhost:4200 and try signing in
2. **Check API endpoints**: Use Postman or curl to test backend
3. **Run E2E tests**: Use webapp-testing skill with Playwright
4. **Monitor logs**: Keep BashOutput open to watch for errors

## Troubleshooting Decision Tree

```
Server won't start?
├─ Port conflict? → Kill process on port
├─ Docker not running? → Start docker compose
├─ Missing .env? → Copy .env.example
├─ Node version? → Check node >= 20
└─ Database error? → Run migrations
```

## Related Documentation

- **ARCHITECTURE.md**: System architecture overview
- **PATTERNS.md**: Development patterns
- **backend/README.md**: Backend-specific setup
- **frontend/README.md**: Frontend-specific setup
- **docker-compose.yml**: Docker service configuration
