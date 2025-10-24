#!/bin/bash

# Singura Development Server Startup Script
# Always uses ports 4200 (frontend) and 4201 (backend)

echo "🧹 Cleaning up existing processes on ports 4200-4203..."
lsof -ti:4200,4201,4202,4203 | xargs -r kill -9 2>/dev/null || true

echo ""
echo "🚀 Starting Singura Development Servers..."
echo "   Backend:  http://localhost:4201/api/health"
echo "   Frontend: http://localhost:4200/"
echo ""

# Start backend
cd /Users/darrenmorgan/AI_Projects/singura/backend
echo "📦 Starting backend on port 4201..."
npx ts-node src/simple-server.ts > /tmp/backend-dev.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait for backend to start
sleep 5

# Start frontend
cd /Users/darrenmorgan/AI_Projects/singura/frontend
echo "🎨 Starting frontend on port 4200..."
pnpm run dev > /tmp/frontend-dev.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

# Wait for frontend to start
sleep 5

echo ""
echo "✅ Servers started successfully!"
echo ""
echo "📊 Status Check:"
curl -s http://localhost:4201/api/health | jq . 2>/dev/null && echo "   ✅ Backend healthy" || echo "   ❌ Backend not responding"
curl -s -o /dev/null -w "   Frontend: HTTP %{http_code}\n" http://localhost:4200/ 2>/dev/null

echo ""
echo "📝 Logs:"
echo "   Backend:  tail -f /tmp/backend-dev.log"
echo "   Frontend: tail -f /tmp/frontend-dev.log"
echo ""
echo "🛑 To stop servers:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
