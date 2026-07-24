export const API_BASE = 'https://one-to-one-backend-858977785048.us-central1.run.app';

import { auth } from './firebase';

const originalFetch = window.fetch;
window.fetch = async (url, options = {}) => {
  const urlStr = typeof url === 'string' ? url : (url instanceof URL ? url.toString() : '');
  const cleanUrl = urlStr.replace(/^https?:\/\/[^\/]+/, '');
  const isBackendRequest = 
    urlStr.includes('one-to-one-backend-858977785048.us-central1.run.app') || 
    urlStr.startsWith('/') || 
    urlStr.startsWith(API_BASE) ||
    cleanUrl.startsWith('/api/') || 
    cleanUrl.startsWith('/admin/');

  if (isBackendRequest) {
    let headers = options.headers || {};
    const isHeadersInstance = headers instanceof Headers;
    let headersObj = new Headers();
    if (isHeadersInstance) {
      headersObj = headers;
    } else {
      // Loop over plain object properties and set them
      Object.keys(headers).forEach(key => {
        headersObj.set(key, headers[key]);
      });
    }

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
      headersObj.set('Authorization', `Bearer ${token}`);
    }
    options.headers = headersObj;
  }
  return originalFetch(url, options);
};
