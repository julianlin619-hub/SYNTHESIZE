import { getApiUrl, getHealthUrl } from '@/config';

// Types for API responses
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
  ok: boolean;
}

// Types for retry configuration
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

// Default retry configuration
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 800,
  maxDelay: 5000,
  backoffMultiplier: 1.5,
};

// Error types for better error handling
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: Response,
    public isCorsError: boolean = false,
    public isNetworkError: boolean = false,
    public isTimeoutError: boolean = false
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Detect error types
function detectErrorType(error: any): {
  isCorsError: boolean;
  isNetworkError: boolean;
  isTimeoutError: boolean;
} {
  const message = error?.message?.toLowerCase() || '';
  
  return {
    isCorsError: message.includes('cors') || message.includes('origin'),
    isNetworkError: message.includes('network') || message.includes('fetch'),
    isTimeoutError: message.includes('timeout') || message.includes('abort'),
  };
}

// Health check function
async function checkBackendHealth(): Promise<boolean> {
  try {
    const healthUrl = getHealthUrl();
    console.log('🏥 Checking backend health at:', healthUrl);
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend health check passed:', data);
      return true;
    } else {
      console.warn('⚠️ Backend health check failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Backend health check error:', error);
    return false;
  }
}

// Exponential backoff delay
function calculateDelay(
  attempt: number,
  config: RetryConfig
): number {
  const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelay);
}

// Main fetch wrapper with retry logic
export async function fetchWithRetry<T = any>(
  input: string | Request,
  init?: RequestInit,
  retryConfig: Partial<RetryConfig> = {}
): Promise<ApiResponse<T>> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  let lastError: Error | null = null;
  
  // First, try a health check if this is the first attempt
  const isFirstAttempt = true;
  if (isFirstAttempt) {
    const isHealthy = await checkBackendHealth();
    if (!isHealthy) {
      console.warn('⚠️ Backend health check failed, proceeding with request anyway...');
    }
  }
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      console.log(`🌐 API request attempt ${attempt + 1}/${config.maxRetries + 1}`);
      
      const response = await fetch(input, {
        ...init,
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });
      
      // Handle successful response
      if (response.ok) {
        try {
          const data = await response.json();
          console.log('✅ API request successful');
          return {
            data,
            status: response.status,
            ok: true,
          };
        } catch (parseError) {
          // Response was successful but couldn't parse JSON
          console.warn('⚠️ Response successful but JSON parse failed:', parseError);
          return {
            status: response.status,
            ok: true,
          };
        }
      }
      
      // Handle error responses
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // Couldn't parse error response, use status text
      }
      
      // Don't retry on client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        throw new ApiError(
          errorMessage,
          response.status,
          response,
          false,
          false,
          false
        );
      }
      
      // For server errors (5xx), throw error to trigger retry
      throw new ApiError(
        errorMessage,
        response.status,
        response,
        false,
        false,
        false
      );
      
    } catch (error: any) {
      lastError = error;
      
      // If this is the last attempt, throw the error
      if (attempt === config.maxRetries) {
        const errorTypes = detectErrorType(error);
        
        if (error instanceof ApiError) {
          throw error;
        }
        
        // Create a proper ApiError from the original error
        throw new ApiError(
          error.message || 'Unknown error occurred',
          0,
          undefined,
          errorTypes.isCorsError,
          errorTypes.isNetworkError,
          errorTypes.isTimeoutError
        );
      }
      
      // Calculate delay for next attempt
      const delay = calculateDelay(attempt, config);
      console.log(`⏳ Retrying in ${delay}ms... (attempt ${attempt + 1}/${config.maxRetries})`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never be reached, but just in case
  throw lastError || new Error('Unknown error occurred');
}

// Convenience function for API calls
export async function apiCall<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = getApiUrl(endpoint as any);
  return fetchWithRetry(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
}

// Health check function for external use
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetchWithRetry(getHealthUrl());
    return response.ok;
  } catch {
    return false;
  }
}
