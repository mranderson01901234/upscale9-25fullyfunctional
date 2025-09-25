#!/bin/bash

echo "🚀 Setting up Enhanced Server for 600+ MP Image Processing"
echo "========================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version $NODE_VERSION detected. Please upgrade to Node.js 16 or higher."
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo ""
echo "📦 Installing server dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Create required directories
echo ""
echo "📁 Creating required directories..."
mkdir -p uploads
mkdir -p composed

# Check if Sharp installed correctly (common issue)
echo ""
echo "🔍 Verifying Sharp installation..."
node -e "
try {
  const sharp = require('sharp');
  console.log('✅ Sharp installed correctly');
  sharp({ create: { width: 100, height: 100, channels: 3, background: { r: 0, g: 0, b: 0 } } })
    .png()
    .toBuffer()
    .then(() => console.log('✅ Sharp functionality verified'))
    .catch(err => {
      console.error('❌ Sharp functionality test failed:', err.message);
      process.exit(1);
    });
} catch (error) {
  console.error('❌ Sharp not properly installed:', error.message);
  console.log('💡 Try running: npm rebuild sharp');
  process.exit(1);
}
" 2>/dev/null

if [ $? -ne 0 ]; then
    echo "⚠️ Sharp installation issue detected. Attempting to rebuild..."
    npm rebuild sharp
    if [ $? -ne 0 ]; then
        echo "❌ Failed to rebuild Sharp. Please check your system dependencies."
        echo "💡 On Ubuntu/Debian: sudo apt-get install libvips-dev"
        echo "💡 On CentOS/RHEL: sudo yum install vips-devel"
        echo "💡 On macOS: brew install vips"
        exit 1
    fi
fi

# Test server startup
echo ""
echo "🧪 Testing server startup..."
timeout 5s node server-enhanced.js > /dev/null 2>&1 &
SERVER_PID=$!
sleep 2

if ps -p $SERVER_PID > /dev/null; then
    kill $SERVER_PID
    echo "✅ Server startup test successful"
else
    echo "❌ Server startup test failed"
    echo "💡 Check server-enhanced.js for errors"
    exit 1
fi

# Create desktop shortcuts/aliases (optional)
echo ""
echo "🔧 Setup complete! Here are your commands:"
echo ""
echo "🌐 Start development server (frontend):"
echo "   npm run dev"
echo ""
echo "🖥️ Start enhanced server (600+ MP processing):"
echo "   npm run server"
echo ""
echo "🚀 Start both servers together:"
echo "   npm run dev:full"
echo ""
echo "📊 Check server health:"
echo "   curl http://localhost:3001/api/health"
echo ""
echo "✨ Ready for 600+ MP image processing!"
echo ""
echo "📋 Next steps:"
echo "   1. Run 'npm run dev:full' to start both servers"
echo "   2. Open http://localhost:5173 in your browser"
echo "   3. Upload a large image and enjoy server-side composition!"
echo ""

# Optional: Create a simple health check script
cat > check-server.sh << 'EOF'
#!/bin/bash
echo "🔍 Checking Enhanced Server Status..."
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Enhanced server is running on port 3001"
    curl -s http://localhost:3001/api/health | grep -o '"status":"[^"]*"' | cut -d'"' -f4
else
    echo "❌ Enhanced server is not running"
    echo "💡 Start it with: npm run server"
fi
EOF

chmod +x check-server.sh
echo "💡 Created check-server.sh for easy health monitoring" 