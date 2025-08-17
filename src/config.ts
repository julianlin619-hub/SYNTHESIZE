// Environment-based configuration
const isDevelopment = import.meta.env.DEV;
const isPreview = import.meta.env.MODE === 'preview';

// Single source of truth for API configuration
export const API_CONFIG = {
  // Base URLs for different environments
  baseUrls: {
    development: 'http://localhost:5055',
    preview: 'https://youtube-gpt-synthesizer.onrender.com',
    production: 'https://youtube-gpt-synthesizer.onrender.com'
  },
  
  // API endpoints
  endpoints: {
    health: '/health',
    test: '/api/test',
    summarize: '/api/summarize'
  }
} as const;

// Get the appropriate base URL based on environment
export const getApiBaseUrl = (): string => {
  if (isDevelopment) return API_CONFIG.baseUrls.development;
  if (isPreview) return API_CONFIG.baseUrls.preview;
  return API_CONFIG.baseUrls.production;
};

// Get full API URL for a specific endpoint
export const getApiUrl = (endpoint: keyof typeof API_CONFIG.endpoints = 'summarize'): string => {
  const baseUrl = getApiBaseUrl();
  const endpointPath = API_CONFIG.endpoints[endpoint];
  
  // In development, use Vite proxy for API calls
  if (isDevelopment && endpoint !== 'health') {
    return endpointPath;
  }
  
  return `${baseUrl}${endpointPath}`;
};

// Health check URL (always direct, never proxied)
export const getHealthUrl = (): string => {
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}${API_CONFIG.endpoints.health}`;
}; 