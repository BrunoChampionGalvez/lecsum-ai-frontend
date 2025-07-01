/**
 * Utility functions for debugging API calls
 */

/**
 * Safely logs a potentially large object with size constraints
 * @param label Text label for the log
 * @param data The data object to log
 * @param maxLength Maximum length of the stringified output (default: 1000)
 */
export const logLargeObject = (label: string, data: unknown, maxLength = 1000) => {
  try {
    const stringified = JSON.stringify(data, null, 2);
    const shortened = stringified.length > maxLength 
      ? `${stringified.substring(0, maxLength)}... (truncated, total length: ${stringified.length})`
      : stringified;
    
    console.log(`${label}:`, shortened);
    
    // For very large objects, also log some basic stats
    if (stringified.length > maxLength) {
      const dataAsObj = data as Record<string, unknown>;
      
      if (typeof data === 'object' && data !== null) {
        // Log counts of keys if it's an object
        const keyCounts = Object.keys(dataAsObj).length;
        console.log(`${label} has ${keyCounts} top-level keys`);
        
        // If it has a textByPages property, log more info about it
        if ('textByPages' in dataAsObj && typeof dataAsObj.textByPages === 'object' && dataAsObj.textByPages !== null) {
          const textByPages = dataAsObj.textByPages as Record<string, string>;
          const pageCount = Object.keys(textByPages).length;
          console.log(`${label} has textByPages with ${pageCount} pages`);
          
          // Log a sample page
          const samplePageKey = Object.keys(textByPages)[0];
          if (samplePageKey) {
            const sampleText = textByPages[samplePageKey];
            console.log(`Sample page ${samplePageKey} text (first 100 chars): ${sampleText.substring(0, 100)}...`);
          }
        }
      }
    }
  } catch (e) {
    console.error(`Error logging ${label}:`, e);
  }
};

/**
 * Enhanced error logging for API requests
 * @param error The error object from a catch block
 * @param context Additional context information
 */
export const logApiError = (error: unknown, context?: string) => {
  const contextPrefix = context ? `[${context}] ` : '';
  
  console.error(`${contextPrefix}API Error:`, error);
  
  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;
    
    if ('response' in errorObj) {
      const response = errorObj.response as Record<string, unknown>;
      console.error(`${contextPrefix}Response status:`, response.status);
      console.error(`${contextPrefix}Response data:`, response.data);
    }
    
    if ('message' in errorObj) {
      console.error(`${contextPrefix}Error message:`, errorObj.message);
    }
    
    if ('config' in errorObj) {
      const config = errorObj.config as Record<string, unknown>;
      console.error(`${contextPrefix}Request URL:`, config.url);
      console.error(`${contextPrefix}Request method:`, config.method);
      console.error(`${contextPrefix}Request headers:`, config.headers);
    }
  }
};
