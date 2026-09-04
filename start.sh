#!/bin/bash

echo "🛑 Stopping all existing processes..."
killall -9 node 2>/dev/null
pkill -9 -f vite 2>/dev/null
pkill -9 -f npm 2>/dev/null
sleep 2

mkdir -p logs

echo "🚀 Starting Backend..."
cd /Users/sushanthks/Developer/HOBBYPROJECT/krishisakha-an-iot-based-farm-assistan/backend
node index.js > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend started (PID: $BACKEND_PID)"

sleep 3

echo "🚀 Starting Frontend..."
cd /Users/sushanthks/Developer/HOBBYPROJECT/krishisakha-an-iot-based-farm-assistan/frontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend started (PID: $FRONTEND_PID)"

sleep 5

echo ""
echo "=== STATUS ==="
if lsof -ti :5001 > /dev/null; then
    echo "✅ Backend: http://localhost:5001"
else
    echo "❌ Backend failed"
    tail -20 ../logs/backend.log 2>/dev/null
fi

if lsof -ti :5173 > /dev/null; then
    echo "✅ Frontend: http://localhost:5173"
else
    echo "❌ Frontend failed"
    tail -20 ../logs/frontend.log 2>/dev/null
fi

echo ""
echo "📝 Login: farmer1@test.com / password123"
echo "🌐 Open: http://localhost:5173"
