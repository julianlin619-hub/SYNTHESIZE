# Deployment Guide

## The Problem
The frontend is getting "Failed to fetch" errors because there's no backend server running in production. The Vite proxy only works in development mode.

## Solution: Deploy Backend to a Hosting Service

### Option 1: Deploy to Heroku (Recommended)

1. **Install Heroku CLI**
   ```bash
   brew install heroku/brew/heroku
   ```

2. **Login to Heroku**
   ```bash
   heroku login
   ```

3. **Create a new Heroku app**
   ```bash
   cd Backend
   heroku create your-app-name
   ```

4. **Set environment variables**
   ```bash
   heroku config:set SUPADATA_API_KEY=your_supadata_api_key
   heroku config:set OPENAI_API_KEY=your_openai_api_key
   ```

5. **Deploy the backend**
   ```bash
   git add .
   git commit -m "Deploy backend"
   git push heroku main
   ```

6. **Update frontend with your backend URL**
   Replace `https://your-backend-app.herokuapp.com` in `src/components/Synthesiser.tsx` with your actual Heroku app URL.

### Option 2: Deploy to Railway

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Deploy**
   ```bash
   cd Backend
   railway init
   railway up
   ```

4. **Set environment variables in Railway dashboard**

### Option 3: Deploy to Render

1. **Connect your GitHub repo to Render**
2. **Create a new Web Service**
3. **Set build command**: `pip install -r requirements.txt`
4. **Set start command**: `gunicorn app:app`
5. **Add environment variables in Render dashboard**

## Update Frontend Configuration

After deploying the backend, update the API URL in `src/components/Synthesiser.tsx`:

```typescript
const apiUrl = isDevelopment 
  ? '/api/summarize' 
  : 'https://your-actual-backend-url.com/api/summarize';
```

## Environment Variables Required

Make sure to set these in your hosting service:
- `SUPADATA_API_KEY`: Your SupaData API key
- `OPENAI_API_KEY`: Your OpenAI API key

## Testing Deployment

After deployment, test your backend:
```bash
curl -X POST https://your-backend-url.com/api/summarize \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

## Frontend Deployment

Deploy the frontend to Vercel, Netlify, or GitHub Pages:

```bash
npm run build
# Upload the dist/ folder to your hosting service
``` 