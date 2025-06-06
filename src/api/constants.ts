// API constants

// For local development, it will use http://localhost:3001 if NEXT_PUBLIC_API_URL is not in .env.local.
// For production (Vercel), it will use the value of NEXT_PUBLIC_API_URL set in Vercel's environment variables.
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
