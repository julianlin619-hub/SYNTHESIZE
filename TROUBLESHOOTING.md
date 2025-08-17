# Troubleshooting Guide: Network Connectivity Issues

## Common Error
```
Network error: Unable to connect to the backend server. This might be a CORS issue or the server is not accessible.
```

## Quick Fixes

### 1. **Restart Both Servers**
```bash
# Stop any running processes
pkill -f "python app.py"
pkill -f "npm run dev"

# Start fresh
./start.sh
```

### 2. **Check Port Availability**
```bash
# Check if port 5055 is in use
lsof -i :5055

# If something is using it, kill it
lsof -ti:5055 | xargs kill -9
```

### 3. **Verify Backend is Running**
```bash
# Check if backend is responding
curl http://localhost:5055/health

# Should return: {"status": "healthy", ...}
```

## Detailed Diagnosis

### **Frontend Connection Issues**

1. **Check Browser Console**
   - Open Developer Tools (F12)
   - Look for CORS errors or network failures
   - Check if requests are being made to the correct URL

2. **Verify Vite Proxy Configuration**
   - Ensure `vite.config.ts` has correct proxy settings
   - Proxy should route `/api/*` to `http://localhost:5055`

3. **Environment Detection**
   - Frontend should use `/api/summarize` in development
   - Production should use the deployed backend URL

### **Backend Connection Issues**

1. **Check Backend Logs**
   ```bash
   cd Backend
   python app.py
   ```
   - Look for startup messages
   - Check for port binding errors
   - Verify API keys are loaded

2. **Test Backend Endpoints**
   ```bash
   # Health check
   curl http://localhost:5055/health
   
   # Test endpoint
   curl http://localhost:5055/api/test
   ```

3. **Verify Environment Variables**
   ```bash
   cd Backend
   cat .env
   ```
   - Ensure `SUPADATA_API_KEY` is set
   - Ensure `OPENAI_API_KEY` is set

### **Network/Firewall Issues**

1. **Check macOS Firewall**
   - System Preferences → Security & Privacy → Firewall
   - Ensure Python and Node.js are allowed

2. **Check Network Configuration**
   ```bash
   # Test localhost connectivity
   ping localhost
   
   # Test specific port
   telnet localhost 5055
   ```

3. **Antivirus Software**
   - Some antivirus software blocks local development servers
   - Add exceptions for your project directory

## Prevention Steps

### 1. **Use the Improved Startup Script**
```bash
chmod +x start.sh
./start.sh
```

### 2. **Monitor Connection Status**
- The app now shows a connection status indicator
- Green = Connected, Red = Disconnected
- Check this before attempting to summarize videos

### 3. **Regular Health Checks**
```bash
# Add to your routine
curl http://localhost:5055/health
```

## Advanced Troubleshooting

### **If Backend Won't Start**

1. **Check Python Version**
   ```bash
   python3 --version
   # Should be 3.8+
   ```

2. **Recreate Virtual Environment**
   ```bash
   cd Backend
   rm -rf venv
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Check Dependencies**
   ```bash
   pip list
   # Ensure all required packages are installed
   ```

### **If Frontend Can't Connect**

1. **Clear Browser Cache**
   - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
   - Clear browser cache and cookies

2. **Check Network Tab**
   - Open Developer Tools → Network
   - Look for failed requests
   - Check request/response details

3. **Test with Different Browser**
   - Try Chrome, Firefox, or Safari
   - Check if issue is browser-specific

## Common Error Messages and Solutions

| Error | Solution |
|-------|----------|
| "Port already in use" | Kill existing process: `lsof -ti:5055 \| xargs kill -9` |
| "Connection refused" | Backend not running - start with `./start.sh` |
| "CORS error" | Backend CORS is configured - check if backend is accessible |
| "API key not configured" | Check `.env` file in Backend directory |
| "Timeout" | Increase timeout in frontend or check backend performance |

## Still Having Issues?

1. **Check the logs**
   - Backend: Look at terminal where `python app.py` is running
   - Frontend: Check browser console

2. **Verify file permissions**
   ```bash
   ls -la start.sh
   chmod +x start.sh
   ```

3. **Test minimal setup**
   ```bash
   cd Backend
   python -c "from app import app; print('App imported successfully')"
   ```

4. **Check system resources**
   - Ensure you have enough RAM/CPU
   - Close other applications that might be using ports

## Contact Information

If you continue to experience issues:
1. Check the GitHub issues page
2. Include error logs and system information
3. Describe what you've already tried from this guide
