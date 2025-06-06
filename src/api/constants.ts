// API constants
// In production, use the local /api proxy to avoid mixed content security errors
const isProduction = process.env.NODE_ENV === 'production';
const apiBase = isProduction ? '/api' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');
export const API_URL = apiBase;
