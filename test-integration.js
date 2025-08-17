#!/usr/bin/env node

/**
 * Integration test script for YouTube GPT Synthesizer Backend
 * Tests CORS preflight, health checks, and API functionality
 */

import https from 'https';
import http from 'http';

// Test configuration
const TEST_CONFIG = {
  local: {
    baseUrl: 'http://localhost:5055',
    origins: ['http://localhost:8080', 'http://localhost:3000']
  },
  production: {
    baseUrl: 'https://youtube-gpt-synthesizer.onrender.com',
    origins: ['https://youtube-gpt-synthesizer.onrender.com']
  }
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const color = passed ? 'green' : 'red';
  log(`${status} ${name}`, color);
  if (details) {
    log(`   ${details}`, 'cyan');
  }
}

// HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 10000
    };
    
    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Test CORS preflight
async function testCorsPreflight(baseUrl, origin, endpoint = '/api/summarize') {
  try {
    const response = await makeRequest(`${baseUrl}${endpoint}`, {
      method: 'OPTIONS',
      headers: {
        'Origin': origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    
    const corsHeaders = response.headers;
    const hasCorsHeaders = corsHeaders['access-control-allow-origin'] &&
                          corsHeaders['access-control-allow-methods'] &&
                          corsHeaders['access-control-allow-headers'];
    
    return {
      passed: response.statusCode === 200 && hasCorsHeaders,
      statusCode: response.statusCode,
      corsHeaders: hasCorsHeaders,
      details: `Status: ${response.statusCode}, CORS: ${hasCorsHeaders ? 'Yes' : 'No'}`
    };
  } catch (error) {
    return {
      passed: false,
      statusCode: 0,
      corsHeaders: false,
      details: `Error: ${error.message}`
    };
  }
}

// Test health endpoint
async function testHealthEndpoint(baseUrl) {
  try {
    const startTime = Date.now();
    const response = await makeRequest(`${baseUrl}/health`);
    const duration = Date.now() - startTime;
    
    let data;
    try {
      data = JSON.parse(response.data);
    } catch {
      data = null;
    }
    
    const isHealthy = response.statusCode === 200 && data && data.status === 'healthy';
    const isFast = duration < 500; // Should respond in under 500ms
    
    return {
      passed: isHealthy && isFast,
      statusCode: response.statusCode,
      duration: duration,
      data: data,
      details: `Status: ${response.statusCode}, Duration: ${duration}ms, Healthy: ${isHealthy}`
    };
  } catch (error) {
    return {
      passed: false,
      statusCode: 0,
      duration: 0,
      data: null,
      details: `Error: ${error.message}`
    };
  }
}

// Test API endpoint
async function testApiEndpoint(baseUrl, origin) {
  try {
    const response = await makeRequest(`${baseUrl}/api/test`, {
      method: 'GET',
      headers: {
        'Origin': origin,
        'Content-Type': 'application/json'
      }
    });
    
    let data;
    try {
      data = JSON.parse(response.data);
    } catch {
      data = null;
    }
    
    const isWorking = response.statusCode === 200 && data && data.status === 'ok';
    
    return {
      passed: isWorking,
      statusCode: response.statusCode,
      data: data,
      details: `Status: ${response.statusCode}, Working: ${isWorking}`
    };
  } catch (error) {
    return {
      passed: false,
      statusCode: 0,
      data: null,
      details: `Error: ${error.message}`
    };
  }
}

// Main test runner
async function runTests() {
  log('🧪 Starting Integration Tests for YouTube GPT Synthesizer Backend', 'blue');
  log('=' .repeat(60), 'blue');
  
  for (const [environment, config] of Object.entries(TEST_CONFIG)) {
    log(`\n🌍 Testing ${environment.toUpperCase()} environment`, 'magenta');
    log(`   Base URL: ${config.baseUrl}`, 'cyan');
    
    // Test health endpoint
    log('\n🏥 Testing health endpoint...');
    const healthResult = await testHealthEndpoint(config.baseUrl);
    logTest('Health Check', healthResult.passed, healthResult.details);
    
    // Test CORS preflight for each origin
    log('\n🌐 Testing CORS preflight...');
    for (const origin of config.origins) {
      const corsResult = await testCorsPreflight(config.baseUrl, origin);
      logTest(`CORS Preflight (${origin})`, corsResult.passed, corsResult.details);
    }
    
    // Test API endpoint for each origin
    log('\n🔌 Testing API endpoint...');
    for (const origin of config.origins) {
      const apiResult = await testApiEndpoint(config.baseUrl, origin);
      logTest(`API Test (${origin})`, apiResult.passed, apiResult.details);
    }
  }
  
  log('\n' + '=' .repeat(60), 'blue');
  log('🏁 Integration tests completed!', 'blue');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch((error) => {
    log(`\n💥 Test runner failed: ${error.message}`, 'red');
    process.exit(1);
  });
}

export {
  testCorsPreflight,
  testHealthEndpoint,
  testApiEndpoint
};
