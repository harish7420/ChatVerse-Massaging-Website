export const BACKEND_URL = (import.meta.env.VITE_API_URL || 'https://chatverse-massaging-website.onrender.com').replace(/\/$/, '');

export const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';
export const DEFAULT_GROUP_AVATAR = 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150';
export const DEFAULT_IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400';

/**
 * Returns a fully qualified media URL for any given path or image reference.
 * Handles relative paths (e.g., 'krishna.jpg', '/uploads/...', 'uploads/...'),
 * Cloudinary URLs, data URIs, and missing paths with fallbacks.
 */
export const getMediaUrl = (url, fallback = DEFAULT_AVATAR) => {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return fallback;
  }
  const cleanUrl = url.trim();

  // Full HTTP/HTTPS or Base64 Data URL
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://') || cleanUrl.startsWith('data:')) {
    return cleanUrl;
  }

  // Relative upload paths
  const path = cleanUrl.startsWith('/') ? cleanUrl : `/${cleanUrl}`;

  if (path.startsWith('/uploads/')) {
    return `${BACKEND_URL}${path}`;
  }

  // If path is a standalone filename like 'krishna.jpg' or '/krishna.jpg'
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
