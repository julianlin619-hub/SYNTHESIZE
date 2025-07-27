#!/bin/bash

echo "🚀 Starting YouTube GPT Synthesizer..."

# Check if .env file exists in Backend directory
if [ ! -f "Backend/.env" ]; then
    echo "⚠️  Warning: Backend/.env file not found!"
    echo "Please create Backend/.env with your API keys:"
    echo "OPENAI_API_KEY=your_openai_api_key_here"
    echo "SUPADATA_API_KEY=your_supadata_api_key_here"
    echo ""
fi

# Start backend server
echo "🔧 Starting backend server on port 5055..."
cd Backend
source venv/bin/activate
python app.py &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend server
echo "🌐 Starting frontend server on port 8080..."
npm run dev &
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