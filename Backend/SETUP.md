# Backend Setup Guide

## The Problem
You're getting a JSON parsing error because the backend server is not properly configured with the required API keys.

## The Solution

### Step 1: Set up API Keys
You need two API keys for the backend to work:

1. **SupaData API Key** - for extracting YouTube video transcripts
   - Get it from: https://supadata.ai/
   - This service extracts transcripts from YouTube videos

2. **OpenAI API Key** - for summarizing the transcripts
   - Get it from: https://platform.openai.com/api-keys
   - This service generates the summaries

### Step 2: Create Environment File
Run the setup script to create your `.env` file:

```bash
cd Backend
python setup_env.py
```

This will prompt you to enter your API keys and create a `.env` file.

### Step 3: Start the Backend Server
```bash
cd Backend
python app.py
```

The server should start on port 5055. You should see:
```
Using SupaData API Key: sk-1234567...
Using OpenAI API Key: sk-1234567...
 * Running on http://127.0.0.1:5055
```

### Step 4: Start the Frontend
In a new terminal:
```bash
npm run dev
```

The frontend should start on port 8080 and proxy API requests to the backend.

## Troubleshooting

### If you still get JSON parsing errors:
1. Make sure the backend is running on port 5055
2. Check that your API keys are valid
3. Verify the frontend is making requests to the correct URL

### If you get API key errors:
1. Make sure your `.env` file exists in the Backend directory
2. Verify your API keys are correct and have sufficient credits
3. Check that the keys are properly formatted (no extra spaces)

### Manual .env file creation:
If the setup script doesn't work, create a `.env` file manually in the Backend directory:

```
SUPADATA_API_KEY=your_supadata_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

## API Key Sources
- **SupaData**: https://supadata.ai/ (for YouTube transcript extraction)
- **OpenAI**: https://platform.openai.com/api-keys (for text summarization) 