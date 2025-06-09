import { apiClient } from './client';

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
    status?: number;
  };
  message?: string;
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  firstName?: string;
  lastName?: string;
}

export const AuthService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('Sending login request to backend...');
      
      // IMPORTANT: apiClient.post already returns the response.data
      // No need to do response.data again
      const authResponse = await apiClient.post<AuthResponse>('/auth/login', credentials);
      console.log('Login API response data:', authResponse);
      
      // Validate response format
      if (!authResponse || !authResponse.accessToken || !authResponse.user) {
        console.error('Invalid response format from login API', authResponse);
        throw new Error('Invalid login response format');
      }
      
      // Clear any existing tokens first
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Store token and user data in localStorage
      localStorage.setItem('token', authResponse.accessToken);
      localStorage.setItem('user', JSON.stringify(authResponse.user));
      
      console.log('Login successful, token stored:', { 
        hasToken: true,
        tokenLength: authResponse.accessToken.length,
        user: authResponse.user
      });
      
      // Check that token was properly stored
      const storedToken = localStorage.getItem('token');
      console.log('Verification - token in localStorage:', {
        exists: !!storedToken,
        length: storedToken?.length
      });
      
      return authResponse;
    } catch (errorRaw) {
      const error = errorRaw as ApiError;
      console.error('Login API error:', error);
      throw error;
    }
  },
  
  async register(registerData: RegisterData): Promise<AuthResponse> {
    try {
      console.log('Sending registration request...', { 
        url: '/auth/register',
        baseURL: apiClient['client'].defaults.baseURL,
        data: { ...registerData, password: '[REDACTED]' } 
      });
      
      // Enhanced debugging for the raw request
      try {
        // Make a raw axios request to see full details
        const response = await apiClient['client'].request({
          method: 'post',
          url: '/auth/register',
          data: registerData
        });
        
        console.log('Raw registration response:', {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data: response.data
        });
        
        const authResponse = response.data;
        
        // Validate response format
        if (!authResponse || !authResponse.accessToken || !authResponse.user) {
          console.error('Invalid response format from registration API', authResponse);
          throw new Error('Invalid registration response format');
        }
        
        // Clear any existing tokens first
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Store token and user data in localStorage
        localStorage.setItem('token', authResponse.accessToken);
        localStorage.setItem('user', JSON.stringify(authResponse.user));
        
        console.log('Registration successful, token stored:', { 
          hasToken: true,
          tokenLength: authResponse.accessToken.length
        });
        
        return authResponse;
      } catch (axiosError: any) {
        console.error('Axios raw error during registration:', {
          message: axiosError.message,
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          responseData: axiosError.response?.data,
          requestURL: axiosError.config?.url,
          requestMethod: axiosError.config?.method,
          requestHeaders: axiosError.config?.headers
        });
        throw axiosError;
      }
    } catch (errorRaw) {
      const error = errorRaw as ApiError;
      console.error('Registration error:', error);
      throw error;
    }
  },
  
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  
  getCurrentUser(): User | null {
    const userJson = localStorage.getItem('user');
    if (!userJson) return null;
    
    try {
      return JSON.parse(userJson);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e: unknown) {
      return null;
    }
  },
  
  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  },
  
  async validateToken(): Promise<boolean> {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
      // Call a backend endpoint to validate the token
      await apiClient.get('/auth/validate');
      return true;
    } catch (errorRaw: unknown) {
      const validationError = errorRaw as ApiError;
      console.error('Token validation error:', validationError);
      // Only logout on specific error codes like 401 Unauthorized
      if (validationError?.response?.status === 401) {
        this.logout();
      }
      return false;
    }
  },
};
