# YouTube GPT Synthesizer

A modern web application that transforms YouTube videos into intelligent, detailed summaries using AI. Built with React (frontend) and Flask (backend).

## Features

- 🎥 **YouTube Video Processing**: Extract and process YouTube video transcripts
- 🤖 **AI-Powered Summaries**: Generate detailed, structured summaries using OpenAI GPT-4
- 📱 **Modern UI**: Beautiful, responsive interface built with React and Tailwind CSS
- 💾 **History Management**: Save and view your previous summaries
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
5. **Access your history** to review previous summaries

## API Endpoints

- `POST /api/summarize` - Summarize a YouTube video
  - Body: `{ "url": "youtube_url" }`
  - Returns: `{ "summary": "html_summary" }`

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

1. **"API key not found" error**:
   - Ensure your `.env` file exists in the `Backend` directory
   - Verify your API keys are correct

2. **"Failed to fetch transcript" error**:
   - Check your SupaData API key
   - Ensure the YouTube video has available transcripts

3. **CORS errors**:
   - The Vite proxy should handle this automatically
   - Ensure both servers are running on the correct ports

4. **Port conflicts**:
   - Backend runs on port 5055
   - Frontend runs on port 8080
   - Change ports in `app.py` and `vite.config.ts` if needed

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.
