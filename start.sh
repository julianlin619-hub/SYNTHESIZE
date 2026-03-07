#!/bin/bash

echo "🚀 Starting YouTube GPT Synthesizer..."

# Check if .env file exists in Backend directory
if [ ! -f "Backend/.env" ]; then
    echo "⚠️  Warning: Backend/.env file not found!"
    echo "Please create Backend/.env with your API keys:"
    echo "ANTHROPIC_API_KEY=your_anthropic_api_key_here"
    echo "SUPADATA_API_KEY=your_supadata_api_key_here"
    echo ""
fi

# Start backend server
echo "🔧 Starting backend server on port 5055..."
cd Backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Creating one..."
    python3 -m venv venv
fi

source venv/bin/activate

# Install/update requirements
echo "📦 Installing/updating Python dependencies..."
pip install -r requirements.txt

# Check if port 5055 is already in use
if lsof -Pi :5055 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 5055 is already in use. Stopping existing process..."
    lsof -ti:5055 | xargs kill -9
    sleep 2
fi

echo "🚀 Starting backend server..."
python app.py &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:5055/health >/dev/null 2>&1; then
        echo "✅ Backend is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Backend failed to start within 30 seconds"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    echo "⏳ Attempt $i/30..."
    sleep 1
done

# Start frontend server
echo "🌐 Starting frontend server on port 8080..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo "✅ Both servers are starting..."
echo "Frontend: http://localhost:8080"
echo "Backend: http://localhost:5055"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user to stop
wait

# Cleanup
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
echo "�� Servers stopped" 