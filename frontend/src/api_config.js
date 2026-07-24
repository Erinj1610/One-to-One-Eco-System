export const API_BASE = 'https://one-to-one-backend-858977785048.us-central1.run.app';

import { auth } from './firebase';

const originalFetch = window.fetch;
window.fetch = async (url, options = {}) => {
  const urlStr = typeof url === 'string' ? url : (url instanceof URL ? url.toString() : '');
  const cleanUrl = urlStr.replace(/^https?:\/\/[^\/]+/, '');
  const isBackendRequest = 
    urlStr.startsWith(API_BASE) || 
    urlStr.includes('one-to-one-backend') || 
    urlStr.startsWith('/') ||
    cleanUrl.startsWith('/api/') || 
    cleanUrl.startsWith('/admin/');

  if (isBackendRequest) {
    // Clone options and headers strictly as shallow copies if modified to avoid mutating default references
    options = { ...options };
    
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
        // If it's a Headers instance, clone it to modify safely
        const clonedHeaders = new Headers(options.headers);
        clonedHeaders.set('Authorization', `Bearer ${token}`);
        options.headers = clonedHeaders;
      } else if (Array.isArray(options.headers)) {
        // Handle list of pairs safely
        options.headers = [...options.headers, ['Authorization', `Bearer ${token}`]];
      } else {
        // Handle plain objects cleanly
        options.headers = {
          ...options.headers,
          'Authorization': `Bearer ${token}`
        };
      }
    }
  }
  return originalFetch(url, options);
};
