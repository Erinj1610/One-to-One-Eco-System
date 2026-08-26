const hostname = typeof window !== 'undefined' ? (window.location.hostname || '') : '';
const isStagingHost = hostname.includes('staging') || hostname.includes('erinj1610s-projects');
export const API_BASE = isStagingHost 
  ? 'https://one-to-one-backend-staging-858977785048.us-central1.run.app'
  : 'https://one-to-one-backend-858977785048.us-central1.run.app';

import { auth } from './firebase';

const originalFetch = window.fetch;
window.fetch = async (url, options = {}) => {
  const urlStr = typeof url === 'string' ? url : (url instanceof URL ? url.toString() : '');
  const cleanUrl = urlStr.replace(/^https?:\/\/[^\/]+/, '');
  
  // Explicitly check if the target destination matches the backend host URL
  const isBackendRequest = 
    urlStr.startsWith(API_BASE) || 
    urlStr.includes('one-to-one-backend-staging') ||
    urlStr.includes('one-to-one-backend-858977785048.us-central1.run.app') ||
    urlStr.includes('one-to-one-backend') || 
    urlStr.startsWith('/') ||
    cleanUrl.startsWith('/api/') || 
    cleanUrl.startsWith('/admin/');

  if (isBackendRequest) {
    const newOptions = { ...options, cache: options.cache || 'no-store' };
    
    let token = null;
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        token = await currentUser.getIdToken();
      } catch (err) {
        console.error("Error getting Firebase token", err);
      }
    } else {
      const saved = localStorage.getItem('mock_user');
      if (saved) {
        token = 'mock-uid-123';
      }
    }

    if (token) {
      if (options.headers instanceof Headers) {
        const clonedHeaders = new Headers(options.headers);
        clonedHeaders.set('Authorization', `Bearer ${token}`);
        newOptions.headers = clonedHeaders;
      } else if (Array.isArray(options.headers)) {
        newOptions.headers = [...options.headers, ['Authorization', `Bearer ${token}`]];
      } else if (options.headers) {
        newOptions.headers = {
          ...options.headers,
          'Authorization': `Bearer ${token}`
        };
      } else {
        newOptions.headers = {
          'Authorization': `Bearer ${token}`
        };
      }
    }
    
    // Explicitly configure mode to cors to enable CORS preflight handshakes
    newOptions.mode = 'cors';
    newOptions.credentials = 'include';
    
    return originalFetch(url, newOptions);
  }
  
  return originalFetch(url, options);
};
