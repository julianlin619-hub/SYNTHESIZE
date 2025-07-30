#!/bin/bash

# Deployment script for the Synthesiser Backend
echo "🚀 Deploying Synthesiser Backend to Heroku..."

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI not found. Please install it first:"
    echo "   brew install heroku/brew/heroku"
    exit 1
fi

# Check if we're in the Backend directory
if [ ! -f "app.py" ]; then
    echo "❌ Please run this script from the Backend directory"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please create it with your API keys first:"
    echo "   python3 setup_env.py"
    exit 1
fi

# Create Heroku app if it doesn't exist
if ! heroku apps:info &> /dev/null; then
    echo "📦 Creating new Heroku app..."
    heroku create
fi

# Get the app name
APP_NAME=$(heroku apps:info --json | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
echo "📱 Using Heroku app: $APP_NAME"

# Set environment variables
echo "🔑 Setting environment variables..."
source .env
heroku config:set SUPADATA_API_KEY="$SUPADATA_API_KEY"
heroku config:set OPENAI_API_KEY="$OPENAI_API_KEY"

# Deploy
echo "🚀 Deploying to Heroku..."
git add .
git commit -m "Deploy backend $(date)"
git push heroku main

# Get the app URL
APP_URL=$(heroku info -s | grep web_url | cut -d= -f2)
echo "✅ Deployment complete!"
echo "🌐 Your backend is available at: $APP_URL"
echo ""
echo "📝 Update your frontend config with this URL:"
echo "   In src/config.ts, replace the production apiUrl with:"
echo "   '$APP_URL/api/summarize'" 