# Quick Backend Deployment

## Option 1: Railway (Recommended - Free & Easy)

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Deploy from Backend directory**:
   ```bash
   cd Backend
   railway init
   railway up
   ```

4. **Set environment variables**:
   ```bash
   railway variables set SUPADATA_API_KEY=your_supadata_key
   railway variables set OPENAI_API_KEY=your_openai_key
   ```

5. **Get your URL**:
   ```bash
   railway domain
   ```

## Option 2: Render (Free Tier)

1. **Go to render.com**
2. **Create new Web Service**
3. **Connect your GitHub repo**
4. **Set build command**: `pip install -r requirements.txt`
5. **Set start command**: `gunicorn app:app`
6. **Add environment variables**:
   - `SUPADATA_API_KEY`
   - `OPENAI_API_KEY`

## Option 3: Heroku (Free Tier Discontinued)

1. **Install Heroku CLI**
2. **Login**: `heroku login`
3. **Create app**: `heroku create your-app-name`
4. **Deploy**: `git push heroku main`
5. **Set config vars**:
   ```bash
   heroku config:set SUPADATA_API_KEY=your_key
   heroku config:set OPENAI_API_KEY=your_key
   ```

## After Deployment

1. **Get your backend URL** (e.g., `https://your-app.railway.app`)
2. **Update frontend**:
   - Set `VITE_BACKEND_URL=https://your-app.railway.app` in your deployment
   - Or update `.env.production` with the URL

## Test Your Deployment

```bash
curl -X POST https://your-backend-url.com/api/summarize \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

You should get a JSON response with the summary. 