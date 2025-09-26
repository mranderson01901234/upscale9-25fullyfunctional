#!/bin/bash

# Pro Upscaler Fresh Start Script
# Kills all processes and starts clean servers for accurate testing

echo "🔄 Starting Pro Upscaler Fresh Environment..."
echo "================================================"

# Function to kill processes safely
kill_process() {
    local process_name="$1"
    local pids=$(pgrep -f "$process_name" 2>/dev/null)
    if [ ! -z "$pids" ]; then
        echo "🔪 Killing $process_name processes: $pids"
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

# Function to kill processes by port
kill_port() {
    local port="$1"
    local pids=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pids" ]; then
        echo "🔪 Killing processes on port $port: $pids"
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

echo "🧹 Cleaning up existing processes..."

# Kill specific processes
kill_process "node server.js"
kill_process "PORT=3002"
kill_process "PORT=3003" 
kill_process "PORT=3004"
kill_process "PORT=3005"
kill_process "PORT=3006"
kill_process "python3 -m http.server"
kill_process "pro-upscaler"
kill_process "pro-engine"

# Kill by ports
kill_port 3002
kill_port 3003
kill_port 3004
kill_port 3005
kill_port 3006
kill_port 8080

echo "⏳ Waiting for processes to terminate..."
sleep 3

echo "🚀 Starting fresh servers..."

# Start Pro Engine Desktop Service (port 3006) with 1.5GB file support
echo "🔧 Starting Pro Engine Desktop Service on port 3006 (1.5GB file support)..."
cd /home/mranderson/Desktop/upscalerapplication/upscale9-25fullyfunctional/pro-engine-desktop/service
PORT=3006 node --expose-gc --max-old-space-size=8192 server.js &
PRO_ENGINE_PID=$!
echo "✅ Pro Engine started (PID: $PRO_ENGINE_PID)"

# Wait for Pro Engine to initialize
sleep 5

# Start Pro Upscaler Server (port 3002) 
echo "🔧 Starting Pro Upscaler Server on port 3002..."
cd /home/mranderson/Desktop/upscalerapplication/upscale9-25fullyfunctional/pro-upscaler/server
PORT=3002 node server.js &
UPSCALER_PID=$!
echo "✅ Pro Upscaler Server started (PID: $UPSCALER_PID)"

# Wait for Upscaler Server to initialize
sleep 3

# Start Client HTTP Server (port 8080)
echo "🔧 Starting Client HTTP Server on port 8080..."
cd /home/mranderson/Desktop/upscalerapplication/upscale9-25fullyfunctional/pro-upscaler/client
python3 -m http.server 8080 &
CLIENT_PID=$!
echo "✅ Client HTTP Server started (PID: $CLIENT_PID)"

# Wait for all services to fully initialize
sleep 5

echo "================================================"
echo "🎉 Fresh Environment Ready!"
echo ""
echo "📊 Running Services:"
echo "   • Pro Engine Desktop: http://localhost:3006"
echo "   • Pro Upscaler Server: http://localhost:3002" 
echo "   • Client Web App: http://localhost:8080"
echo ""
echo "🔗 Process IDs:"
echo "   • Pro Engine PID: $PRO_ENGINE_PID"
echo "   • Upscaler PID: $UPSCALER_PID"
echo "   • Client PID: $CLIENT_PID"
echo ""

# Health checks
echo "🏥 Health Checks:"

# Check Pro Engine
if curl -s http://localhost:3006/health > /dev/null 2>&1; then
    echo "   ✅ Pro Engine: HEALTHY"
else
    echo "   ❌ Pro Engine: NOT RESPONDING"
fi

# Check Pro Upscaler Server
if curl -s http://localhost:3002/health > /dev/null 2>&1; then
    echo "   ✅ Pro Upscaler Server: HEALTHY"
else
    echo "   ❌ Pro Upscaler Server: NOT RESPONDING"
fi

# Check Client Server
if curl -s http://localhost:8080/ > /dev/null 2>&1; then
    echo "   ✅ Client HTTP Server: HEALTHY"
else
    echo "   ❌ Client HTTP Server: NOT RESPONDING"
fi

echo ""
echo "🎯 Ready for Testing!"
echo "   Open: http://localhost:8080"
echo ""
echo "🛑 To stop all services, run:"
echo "   kill $PRO_ENGINE_PID $UPSCALER_PID $CLIENT_PID"
echo ""
echo "📝 Logs will appear below (Ctrl+C to stop):"
echo "================================================"

# Keep script running and show logs
trap 'echo "🛑 Stopping all services..."; kill $PRO_ENGINE_PID $UPSCALER_PID $CLIENT_PID 2>/dev/null; exit 0' INT

# Wait for any service to exit
wait 