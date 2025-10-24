#!/bin/bash

# Singura Development Server Shutdown Script

echo "🛑 Stopping Singura Development Servers..."
echo ""

# Kill processes on ports 4200-4203
PIDS=$(lsof -ti:4200,4201,4202,4203 2>/dev/null)

if [ -z "$PIDS" ]; then
    echo "✅ No servers running on ports 4200-4203"
else
    echo "🔪 Killing processes:"
    lsof -i:4200,4201,4202,4203 | grep LISTEN
    lsof -ti:4200,4201,4202,4203 | xargs kill -9 2>/dev/null
    echo ""
    echo "✅ All servers stopped"
fi

echo ""
echo "📝 Log files preserved:"
echo "   Backend:  /tmp/backend-dev.log"
echo "   Frontend: /tmp/frontend-dev.log"
echo ""
