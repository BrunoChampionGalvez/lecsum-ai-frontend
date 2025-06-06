import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// Base API client configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class ApiClient {
  private client: AxiosInstance;
  
  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Add request interceptor to include auth token
    this.client.interceptors.request.use((config) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      console.log(`API Request to ${config.url}:`, { 
        hasToken: !!token, 
        tokenLength: token ? token.length : 0 
      });
      
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        console.warn(`No token available for request to ${config.url}`);
      }
      
      return config;
    });
    
    // Add response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        // Only clear token on 401 but don't redirect automatically
        if (error.response && error.response.status === 401) {
          // Just clear local storage without redirect
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Removed automatic redirect to allow components to handle errors
          }
        }
        
        return Promise.reject(error);
      }
    );
  }
  
  // Generic request method
  async request<T>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.client.request<T>(config);
    return response.data;
  }
  
  // Helper methods for common HTTP verbs
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }
  
  async post<T>(url: string, data: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }
  
  async put<T>(url: string, data: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }
  
  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'patch', url, data });
  }
  
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

// Create a singleton instance
export const apiClient = new ApiClient();
