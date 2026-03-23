#!/bin/bash

# OpenClaw Chat Proxy Deployment Script
# Usage: ./deploy.sh

set -e

echo "🚀 Deploying OpenClaw Chat Proxy..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Installing..."
    apt-get update && apt-get install -y nodejs npm
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if server is already running
if pgrep -f "node server.js" > /dev/null; then
    echo "🔄 Restarting existing server..."
    pkill -f "node server.js"
    sleep 2
fi

# Start server
echo "🚀 Starting server..."
nohup node server.js > proxy.log 2>&1 &

# Wait for server to start
sleep 3

# Check if server is running
if pgrep -f "node server.js" > /dev/null; then
    echo "✅ Server started successfully!"
    echo "📊 PID: $(pgrep -f "node server.js")"
    echo "📝 Logs: proxy.log"
else
    echo "❌ Failed to start server. Check proxy.log for errors."
    exit 1
fi

# Test health endpoint
echo "🧪 Testing health endpoint..."
curl -s http://localhost:3000/health || echo "⚠️ Health check failed"

echo ""
echo "🎯 Deployment complete!"
echo "📡 API Endpoint: http://localhost:3000/api/chat"
echo "🏥 Health Check: http://localhost:3000/health"
echo "📋 Next steps:"
echo "   1. Configure Apache reverse proxy"
echo "   2. Update Angular app to use /api/chat endpoint"
echo "   3. Test chat functionality"