// Configuration for different environments
export const config = {
  // Development: Use local proxy
  development: {
    apiUrl: '/api/summarize'
  },
  // Production: Use deployed backend URL
  production: {
    // Render backend URL
    apiUrl: 'https://youtube-gpt-synthesizer.onrender.com/api/summarize'
  }
};

// Get the appropriate API URL based on environment
export const getApiUrl = () => {
  const isDevelopment = import.meta.env.DEV;
  return isDevelopment ? config.development.apiUrl : config.production.apiUrl;
}; 