# YouTube GPT Synthesizer

A modern web application that transforms YouTube videos into intelligent, detailed summaries using AI. Built with React (frontend) and Flask (backend).

## Features

- 🎥 **YouTube Video Processing**: Extract and process YouTube video transcripts
- 🤖 **AI-Powered Summaries**: Generate detailed, structured summaries using OpenAI GPT-4
- 📱 **Modern UI**: Beautiful, responsive interface built with React and Tailwind CSS

- ⚡ **Real-time Processing**: Live progress tracking during summarization

## Prerequisites

- Node.js (v18 or higher)
- Python 3.8 or higher
- OpenAI API key
- SupaData API key

## Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd youtube-gpt-synthesizer
```

### 2. Install Frontend Dependencies
```bash
npm install
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
echo "OPENAI_API_KEY=your_openai_api_key_here" > .env
echo "SUPADATA_API_KEY=your_supadata_api_key_here" >> .env
cd ..
```

**Required API Keys:**
- **OpenAI API Key**: Get from [OpenAI Platform](https://platform.openai.com/api-keys)
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
   npm run dev
   ```
   Frontend will run on `http://localhost:8080`

### Using the Application

1. **Open your browser** and navigate to `http://localhost:8080`
2. **Paste a YouTube URL** in the input field
3. **Click "Summarise"** to process the video
4. **View the generated summary** with detailed insights
5. **View the generated summary** with detailed insights

## API Endpoints

- `GET /health` - Health check endpoint
  - Returns: `{ "status": "healthy", "timestamp": "...", "cors_origins": [...] }`
- `GET /api/test` - API test endpoint
  - Returns: `{ "status": "ok", "message": "...", "cors_origin": "..." }`
- `POST /api/summarize` - Summarize a YouTube video
  - Body: `{ "url": "youtube_url" }`
  - Returns: `{ "summary": "html_summary" }`

## CORS Configuration

The backend is configured with specific CORS origins for security:

**Allowed Origins:**
- `http://localhost:8080` (Local development)
- `http://localhost:3000` (Alternative local port)
- `https://youtube-gpt-synthesizer.onrender.com` (Production backend)

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
- `OPENAI_API_KEY` - Your OpenAI API key
- `SUPADATA_API_KEY` - Your SupaData API key
- `FLASK_ENV` - Set to 'production' for production deployment

**Frontend:**
- Automatically detects environment (dev/preview/prod)
- Uses Vite proxy in development
- Direct API calls in production

## Testing

### Integration Tests

Run comprehensive integration tests:

```bash
# Test local backend
npm run test:integration

# Test specific endpoints
npm run test:health
npm run test:cors
```

### Manual Testing

1. **Health Check**: `curl http://localhost:5055/health`
2. **CORS Preflight**: `curl -X OPTIONS -H 'Origin: http://localhost:8080' http://localhost:5055/api/summarize`
3. **API Test**: `curl http://localhost:5055/api/test`

## Project Structure

```
youtube-gpt-synthesizer/
├── src/                    # React frontend source
│   ├── components/        # React components
│   ├── pages/            # Page components
│   └── ...
├── Backend/              # Flask backend
│   ├── app.py           # Main Flask application
│   ├── requirements.txt  # Python dependencies
│   └── venv/            # Python virtual environment
├── package.json          # Node.js dependencies
└── vite.config.ts       # Vite configuration
```

## Development

### Frontend Development
- Built with React 18 + TypeScript
- Styled with Tailwind CSS
- Uses Vite for fast development
- Includes shadcn/ui components

### Backend Development
- Flask-based REST API
- OpenAI GPT-4 integration
- SupaData for YouTube transcript extraction
- CORS enabled for frontend communication

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
