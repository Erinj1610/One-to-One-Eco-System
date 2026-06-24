export const API_BASE = 'https://one-to-one-backend-858977785048.us-central1.run.app';

import { auth } from './firebase';

const originalFetch = window.fetch;
window.fetch = async (url, options = {}) => {
  if (typeof url === 'string' && (url.startsWith(API_BASE) || url.includes('/api/') || url.includes('/admin/'))) {
    let headers = options.headers || {};
    const isHeadersInstance = headers instanceof Headers;
    
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
      if (isHeadersInstance) {
        headers.set('Authorization', `Bearer ${token}`);
      } else {
        headers = {
          ...headers,
          'Authorization': `Bearer ${token}`
        };
      }
    }
    options.headers = headers;
  }
  return originalFetch(url, options);
};
