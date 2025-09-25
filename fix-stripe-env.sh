#!/bin/bash

echo "🔧 FIXING STRIPE ENVIRONMENT CONFIGURATION"
echo "=========================================="

# Create .env file in server directory
ENV_FILE="/home/mranderson/desktophybrid/pro-upscaler/server/.env"

echo "📝 Creating .env file with Stripe configuration..."

cat > "$ENV_FILE" << 'EOF'
# Stripe Configuration
# Replace these with your actual Stripe keys from https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_test_51234567890abcdefghijklmnopqrstuvwxyz
STRIPE_PUBLISHABLE_KEY=pk_test_51234567890abcdefghijklmnopqrstuvwxyz
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdefghijklmnopqrstuvwxyz

# JWT Secret for authentication
JWT_SECRET=your-jwt-secret-key-change-in-production-$(date +%s)

# Server Configuration
PORT=3002
NODE_ENV=development

# Supabase Configuration (already hardcoded in the service)
# SUPABASE_URL=https://vztoftcjbwzwioxarovy.supabase.co
# SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EOF

echo "✅ Created .env file at: $ENV_FILE"

echo ""
echo "⚠️  IMPORTANT: You need to replace the placeholder Stripe keys with real ones:"
echo "   1. Go to https://dashboard.stripe.com/test/apikeys"
echo "   2. Copy your Secret Key (starts with sk_test_...)"
echo "   3. Copy your Publishable Key (starts with pk_test_...)"
echo "   4. Update the .env file with your actual keys"

echo ""
echo "🧪 TESTING SERVER STARTUP"
echo "========================="

cd /home/mranderson/desktophybrid/pro-upscaler/server

# Stop any existing server
echo "🛑 Stopping existing server processes..."
pkill -f "node server.js" 2>/dev/null || true
sleep 2

# Start server to test
echo "🚀 Starting server with environment configuration..."
timeout 10s node server.js &
SERVER_PID=$!

sleep 3

# Check if server started
if ps -p $SERVER_PID > /dev/null 2>&1; then
    echo "✅ Server started successfully on port 3002"
    
    # Test health endpoint
    HEALTH_RESPONSE=$(curl -s http://localhost:3002/health 2>/dev/null || echo "failed")
    if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
        echo "💚 Health check passed"
    else
        echo "⚠️  Health check failed - server might still be starting"
    fi
    
    # Kill test server
    kill $SERVER_PID 2>/dev/null || true
else
    echo "❌ Server failed to start - check the logs above"
fi

echo ""
echo "🎯 NEXT STEPS:"
echo "=============="
echo "1. Update .env file with real Stripe keys"
echo "2. Run: cd /home/mranderson/desktophybrid/pro-upscaler/server && node server.js"
echo "3. Or use: ./start-payment-system.sh (after updating Stripe keys)"

echo ""
echo "📋 Current .env file contents:"
echo "-----------------------------"
cat "$ENV_FILE" 