# YouTube Synthesiser - Production Deployment Guide

## Overview
This guide covers deploying the YouTube Synthesiser to production using Vercel (frontend) and Render (backend).

## Architecture
- **Frontend**: Vercel (React + Vite)
- **Backend**: Render (Flask + Python)
- **Communication**: Direct HTTPS calls from Vercel to Render

## Environment Variables

### Backend (Render)
Set these in your Render service dashboard:

```bash
SUPADATA_API_KEY=your_supadata_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
FLASK_ENV=production
FRONTEND_ORIGINS=https://youtube-gpt-synthesizer.vercel.app,https://youtube-gpt-synthesizer-git-main.vercel.app
```

### Frontend (Vercel)
Set these in your Vercel project dashboard:

```bash
VITE_API_BASE_URL=https://youtube-gpt-synthesizer-backend.onrender.com
```

## Deployment Steps

### 1. Backend (Render)
1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set build command: `pip install -r Backend/requirements.txt`
4. Set start command: `gunicorn Backend.app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120 --keep-alive 5 --max-requests 1000 --max-requests-jitter 100`
5. Set root directory to `.`
6. Add environment variables listed above
7. Deploy

### 2. Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variables listed above
5. Deploy

## Verification Checklist

### Backend Health Check
```bash
# Test basic connectivity
curl -I https://youtube-gpt-synthesizer-backend.onrender.com/health

# Test CORS preflight
curl -X OPTIONS \
  -H "Origin: https://youtube-gpt-synthesizer.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  https://youtube-gpt-synthesizer-backend.onrender.com/api/summarize

# Test version endpoint
curl https://youtube-gpt-synthesizer-backend.onrender.com/version
```

### Frontend Integration Test
1. Open your Vercel app in browser
2. Open Developer Tools → Network tab
3. Try to summarize a YouTube video
4. Verify:
   - OPTIONS preflight returns 200 with CORS headers
   - POST request succeeds
   - No mixed content warnings
   - No CORS errors

## Troubleshooting

### Common Issues

#### 1. "Failed to fetch" Error
- Check if `VITE_API_BASE_URL` is set correctly in Vercel
- Verify backend is running and accessible
- Check CORS configuration in backend

#### 2. CORS Errors
- Ensure `FRONTEND_ORIGINS` includes your Vercel domain
- Check that backend is responding to OPTIONS requests
- Verify `Access-Control-Allow-Origin` header is present

#### 3. Timeout Errors
- Backend timeout is set to 120 seconds
- Frontend timeout is set to 120 seconds
- Consider reducing for very long videos

#### 4. Environment Variables Not Loading
- Restart Render service after adding env vars
- Check Vercel environment variable names (must start with `VITE_`)
- Verify in browser console that `import.meta.env.VITE_API_BASE_URL` is set

## Monitoring

### Backend Logs (Render)
- Check Render dashboard for service logs
- Monitor `/health` endpoint for uptime
- Watch for API key validation errors

### Frontend Monitoring (Vercel)
- Check Vercel analytics for error rates
- Monitor browser console for fetch errors
- Verify environment variables are loaded

## Security Notes
- API keys are stored securely in Render environment variables
- CORS is configured to only allow specific origins
- No sensitive data is exposed to frontend
- All communication uses HTTPS

## Support
If you encounter issues:
1. Check this deployment guide
2. Verify environment variables are set correctly
3. Test backend endpoints directly
4. Check browser console and network tab for errors
5. Review Render and Vercel logs 