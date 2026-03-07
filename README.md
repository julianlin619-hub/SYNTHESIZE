# YouTube GPT Synthesizer

A modern web application that transforms YouTube videos into intelligent, detailed summaries using AI. Built with React (frontend) and Flask (backend).

## Features

- 🎥 **YouTube Video Processing**: Extract and process YouTube video transcripts
- 🤖 **AI-Powered Summaries**: Generate detailed, structured summaries using Anthropic Claude
- 📱 **Modern UI**: Beautiful, responsive interface built with React and Tailwind CSS

- ⚡ **Real-time Processing**: Live progress tracking during summarization

## Prerequisites

- Node.js (v18 or higher)
- Python 3.8 or higher
- Anthropic API key
- SupaData API key

## Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd youtube-gpt-synthesizer
```

### 2. Install Frontend Dependencies
```bash
cd frontend && npm install
```

### 3. Install Backend Dependencies
```bash
cd Backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### 4. Configure API Keys
Create a `.env` file in the `Backend` directory:
```bash
cd Backend
echo "ANTHROPIC_API_KEY=your_anthropic_api_key_here" > .env
echo "SUPADATA_API_KEY=your_supadata_api_key_here" >> .env
cd ..
```

**Required API Keys:**
- **Anthropic API Key**: Get from [Anthropic Console](https://console.anthropic.com/) for Claude
- **SupaData API Key**: Get from [SupaData](https://supadata.ai/) for YouTube transcript access

## Usage

### Quick Start
Use the provided startup script:
```bash
./start.sh
```

### Manual Start
1. **Start Backend Server**:
   ```bash
   cd Backend
   source venv/bin/activate
   python app.py
   ```
   Backend will run on `http://localhost:5055`

2. **Start Frontend Server** (in a new terminal):
   ```bash
   cd frontend && npm run dev
   ```
   Frontend will run on `http://localhost:8080`

### Using the Application

1. **Open your browser** and navigate to `http://localhost:8080`
2. **Paste a YouTube URL** in the input field
3. **Click "Summarise"** to process the video
4. **View the generated summary** with detailed insights

## API Endpoints

- `GET /health` - Health check endpoint
  - Returns: `{ "status": "healthy", "timestamp": "..." }`
- `GET /api/test` - API test endpoint
  - Returns: `{ "status": "ok", "supadata": bool, "anthropic": bool }`
- `POST /api/summarize` - Summarize a YouTube video (streaming)
  - Body: `{ "url": "youtube_url" }`
  - Returns: Server-Sent Events stream with markdown chunks

## CORS Configuration

The backend is configured with specific CORS origins for security:

**Allowed Origins:**
- `http://localhost:8080`, `http://localhost:5173` (Local development)
- `https://youtube-gpt-synthesizer.vercel.app` (Production frontend)
- Any `*.vercel.app` subdomain

**CORS Headers:**
- Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
- Headers: Content-Type, Authorization
- Credentials: Disabled (no cookies needed)
- Preflight Cache: 24 hours

### Adding New Domains

To add a new frontend domain (e.g., Vercel deployment):

1. Update `Backend/app.py`:
   ```python
   ALLOWED_ORIGINS = {
       "http://localhost:8080",
       "https://your-app.vercel.app",  # Add your domain here
       "https://www.your-app.vercel.app",
   }
   ```

2. Redeploy the backend

## Environment Variables

**Backend (.env file):**
- `ANTHROPIC_API_KEY` - Your Anthropic API key for Claude
- `SUPADATA_API_KEY` - Your SupaData API key
- `FLASK_ENV` - Set to 'production' for production deployment

**Frontend:**
- Automatically detects environment (dev/preview/prod)
- Uses Vite proxy in development
- Direct API calls in production

## Testing

### Manual Testing

1. **Health Check**: `curl http://localhost:5055/health`
2. **CORS Preflight**: `curl -X OPTIONS -H 'Origin: http://localhost:8080' http://localhost:5055/api/summarize`
3. **API Test**: `curl http://localhost:5055/api/test`

## Project Structure

```
SYNTHESIZE/
├── frontend/              # React + Vite frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   └── pages/        # Page components
│   ├── package.json
│   └── vite.config.ts
├── Backend/               # Flask backend
│   ├── app.py            # Main Flask application
│   ├── requirements.txt  # Python dependencies
│   └── templates/        # Backend HTML templates
├── start.sh               # Start both servers
├── vercel.json            # Vercel deployment config
└── render.yaml            # Render deployment config
```

## Development

### Frontend Development
- Built with React 18 + TypeScript
- Styled with Tailwind CSS
- Uses Vite for fast development
- Includes shadcn/ui components

### Backend Development
- Flask-based REST API
- Anthropic Claude integration for summarization
- SupaData for YouTube transcript extraction
- CORS enabled for frontend communication

## Production Deployment

### Overview
The YouTube Synthesiser is designed to work in production using:
- **Frontend**: Vercel (React + Vite)
- **Backend**: Render (Flask + Python)

### Quick Deployment

1. **Deploy Backend to Render**:
   - Connect your GitHub repo to Render (or use `render.yaml`)
   - Set build command: `pip install -r Backend/requirements.txt`
   - Set start command: `gunicorn Backend.app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120`
   - Add environment variables: `SUPADATA_API_KEY`, `ANTHROPIC_API_KEY`, `FLASK_ENV=production`, `FRONTEND_ORIGINS`

2. **Deploy Frontend to Vercel**:
   - Connect your GitHub repo to Vercel (root config in `vercel.json`)
   - Build command and output directory are pre-configured
   - Frontend proxies `/api` to your Render backend via Vercel rewrites (if configured)

### Environment Variables

**Backend (Render):**
```bash
SUPADATA_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
FLASK_ENV=production
FRONTEND_ORIGINS=https://your-app.vercel.app
```

### Verification
- Backend health: `curl https://your-service.onrender.com/health`
- CORS test: `curl -X OPTIONS -H "Origin: https://your-app.vercel.app" https://your-service.onrender.com/api/summarize`
- Frontend: Open your Vercel app and test video summarization

## Troubleshooting

### Common Issues

**"Network error: Unable to connect to backend server"**

1. **Check if backend is running**:
   ```bash
   curl http://localhost:5055/health
   ```

2. **Check port availability**:
   ```bash
   lsof -i :5055
   ```

3. **Restart both servers**:
   ```bash
   ./start.sh
   ```

**CORS Errors**

1. **Verify origin is allowed** in `Backend/app.py`
2. **Check browser console** for specific CORS messages
3. **Ensure backend is accessible** from frontend origin

**API Key Issues**

1. **"API key not found" error**:
   - Ensure your `.env` file exists in the `Backend` directory
   - Verify your API keys are correct

2. **"Failed to fetch transcript" error**:
   - Check your SupaData API key
   - Ensure the YouTube video has available transcripts

**Port Conflicts**

- Backend runs on port 5055
- Frontend runs on port 8080
- Change ports in `app.py` and `vite.config.ts` if needed

**Cold Start Issues (Render Free Tier)**

- Backend may take 10-30 seconds to wake up
- Frontend automatically retries with exponential backoff
- Health check endpoint helps detect when backend is ready

### Debug Mode

Enable detailed logging:

```bash
cd Backend
export FLASK_ENV=development
python app.py
```

Check logs for:
- Request/response details
- CORS preflight requests
- API key validation
- Error details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.
