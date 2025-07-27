// API Configuration
export const getBackendUrl = (): string => {
  // Use environment variable if defined
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  
  // Fallback to localhost for development
  return 'http://localhost:5055';
};

export const API_ENDPOINTS = {
  summarize: `${getBackendUrl()}/api/summarize`,
} as const; 