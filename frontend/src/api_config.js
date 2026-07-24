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
    if (!options.headers) {
      options.headers = {};
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
      if (options.headers instanceof Headers) {
        options.headers.set('Authorization', `Bearer ${token}`);
      } else {
        options.headers['Authorization'] = `Bearer ${token}`;
      }
    }
  }
  return originalFetch(url, options);
};
