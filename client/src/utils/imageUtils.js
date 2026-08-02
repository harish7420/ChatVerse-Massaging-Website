export const BACKEND_URL = (import.meta.env.VITE_API_URL || 'https://chatverse-massaging-website.onrender.com').replace(/\/$/, '');

export const DEFAULT_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2394a3b8"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-3.8-1.04-4.84-2.6.03-1.6 3.23-2.48 4.84-2.48s4.81.88 4.84 2.48C15.8 18.96 14.03 20 12 20z"/></svg>`;
export const DEFAULT_GROUP_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236366f1"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>`;
export const DEFAULT_IMAGE_FALLBACK = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2364748b"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>`;

/**
 * Converts a File object to a Base64 data URL string.
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Returns a fully qualified media URL for any given path or image reference.
 * Handles Base64 data URIs, HTTP/HTTPS URLs, relative paths, and fallbacks.
 */
export const getMediaUrl = (url, fallback = DEFAULT_AVATAR) => {
  if (!url || typeof url !== 'string' || url.trim() === '' || url === 'undefined' || url === 'null') {
    return fallback;
  }
  const cleanUrl = url.trim();

  // Full HTTP/HTTPS or Base64 Data URL
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://') || cleanUrl.startsWith('data:')) {
    return cleanUrl;
  }

  // Relative upload paths fallback
  const path = cleanUrl.startsWith('/') ? cleanUrl : `/${cleanUrl}`;
  if (path.startsWith('/uploads/')) {
    return `${BACKEND_URL}${path}`;
  }

  if (cleanUrl.match(/\.(jpeg|jpg|png|gif|webp|svg)$/i)) {
    const filename = cleanUrl.replace(/^\//, '');
    return `${BACKEND_URL}/uploads/${filename}`;
  }

  return `${BACKEND_URL}${path}`;
};

/**
 * Image onError handler to replace broken or failed image URLs with a default fallback avatar or image.
 */
export const handleImageError = (e, fallback = DEFAULT_AVATAR) => {
  if (e && e.target && e.target.src !== fallback) {
    e.target.onerror = null;
    e.target.src = fallback;
  }
};

