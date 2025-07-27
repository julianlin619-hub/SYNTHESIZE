# Deployment Guide

## The Problem
You're getting a 404 error because the frontend is trying to call `/api/summarize` but the backend isn't deployed at that URL.

## Solutions

### Option 1: Deploy Backend to Same Domain (Recommended)

If you're deploying to a platform like Vercel, Netlify, or similar:

1. **Deploy the backend** to the same domain as your frontend
2. **Update the API configuration** in `src/config/api.ts`:

```typescript
// Replace with your actual backend URL
return 'https://your-app.vercel.app'; // or your actual domain
```

### Option 2: Deploy Backend Separately

1. **Deploy the backend** to a service like:
   - Heroku
   - Railway
   - Render
   - DigitalOcean App Platform

2. **Set environment variable** in your frontend deployment:
   ```
   VITE_BACKEND_URL=https://your-backend-app.herokuapp.com
   ```

3. **Update the fallback URL** in `src/config/api.ts`:
   ```typescript
   return 'https://your-backend-app.herokuapp.com';
   ```

### Option 3: Use Environment Variables

1. **Create a `.env` file** in your frontend root:
   ```
   VITE_BACKEND_URL=https://your-backend-domain.com
   ```

2. **The config will automatically use this URL** in production.

## Quick Fix for Testing

If you want to test quickly, update `src/config/api.ts`:

```typescript
// Replace this line:
return 'https://your-backend-domain.com';

// With your actual backend URL, for example:
return 'https://your-app.herokuapp.com';
```

## Backend Deployment

To deploy the backend:

1. **Create a `requirements.txt`** (already exists)
2. **Create a `Procfile`** (already exists)
3. **Set environment variables**:
   - `SUPADATA_API_KEY`
   - `OPENAI_API_KEY`

4. **Deploy to your chosen platform**

## Testing

After deployment, test the API endpoint:
```bash
curl -X POST https://your-backend-url.com/api/summarize \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

You should get a JSON response with the summary HTML. 