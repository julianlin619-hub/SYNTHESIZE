#!/bin/bash

# Production Deployment Test Script
# This script verifies that your YouTube Synthesiser is working in production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="https://youtube-gpt-synthesizer-backend.onrender.com"
FRONTEND_URL="https://youtube-gpt-synthesizer.vercel.app"

echo -e "${BLUE}🔍 YouTube Synthesiser Production Test${NC}"
echo "=================================="
echo ""

# Test 1: Backend Health Check
echo -e "${YELLOW}1. Testing Backend Health...${NC}"
if curl -s -f "$BACKEND_URL/health" > /dev/null; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
    exit 1
fi

# Test 2: Backend Version Endpoint
echo -e "${YELLOW}2. Testing Backend Version...${NC}"
VERSION_RESPONSE=$(curl -s "$BACKEND_URL/version")
echo "Version info: $VERSION_RESPONSE"
if echo "$VERSION_RESPONSE" | grep -q "version"; then
    echo -e "${GREEN}✅ Version endpoint working${NC}"
else
    echo -e "${RED}❌ Version endpoint failed${NC}"
fi

# Test 3: CORS Preflight (OPTIONS)
echo -e "${YELLOW}3. Testing CORS Preflight...${NC}"
CORS_RESPONSE=$(curl -s -X OPTIONS \
    -H "Origin: $FRONTEND_URL" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: content-type" \
    "$BACKEND_URL/api/summarize")

if echo "$CORS_RESPONSE" | grep -q "access-control-allow-origin"; then
    echo -e "${GREEN}✅ CORS preflight working${NC}"
else
    echo -e "${RED}❌ CORS preflight failed${NC}"
    echo "Response: $CORS_RESPONSE"
fi

# Test 4: API Test Endpoint
echo -e "${YELLOW}4. Testing API Test Endpoint...${NC}"
API_TEST_RESPONSE=$(curl -s "$BACKEND_URL/api/test")
if echo "$API_TEST_RESPONSE" | grep -q "status.*ok"; then
    echo -e "${GREEN}✅ API test endpoint working${NC}"
else
    echo -e "${RED}❌ API test endpoint failed${NC}"
    echo "Response: $API_TEST_RESPONSE"
fi

# Test 5: Frontend Accessibility
echo -e "${YELLOW}5. Testing Frontend Accessibility...${NC}"
if curl -s -f "$FRONTEND_URL" > /dev/null; then
    echo -e "${GREEN}✅ Frontend is accessible${NC}"
else
    echo -e "${RED}❌ Frontend is not accessible${NC}"
fi

# Test 6: Environment Variables Check
echo -e "${YELLOW}6. Checking Environment Variables...${NC}"
ENV_CHECK=$(curl -s "$BACKEND_URL/version" | grep -o '"api_keys_configured":{[^}]*}')
echo "Environment check: $ENV_CHECK"

if echo "$ENV_CHECK" | grep -q '"supadata": true' && echo "$ENV_CHECK" | grep -q '"openai": true'; then
    echo -e "${GREEN}✅ All required API keys are configured${NC}"
else
    echo -e "${RED}❌ Missing required API keys${NC}"
    echo "Check your Render environment variables"
fi

echo ""
echo -e "${BLUE}🎯 Production Test Summary${NC}"
echo "=============================="
echo -e "${GREEN}✅ Backend: $BACKEND_URL${NC}"
echo -e "${GREEN}✅ Frontend: $FRONTEND_URL${NC}"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "1. Open your frontend in a browser"
echo "2. Try to summarize a YouTube video"
echo "3. Check browser console for any errors"
echo "4. Monitor Network tab for successful API calls"
echo ""
echo -e "${GREEN}🚀 Your YouTube Synthesiser should now be working in production!${NC}"
