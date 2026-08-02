const cloudinary = require('../config/cloudinary');

/**
 * Upload a file buffer to Cloudinary using upload_stream
 * @param {Buffer} fileBuffer - File buffer from Multer memoryStorage
 * @param {Object} options - Cloudinary upload options (folder, resource_type, etc.)
 * @returns {Promise<string>} - Returns secure_url of uploaded media
 */
const uploadToCloudinary = (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: 'chatverse',
      resource_type: 'auto',
      ...options,
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('Cloudinary Upload Stream Error:', error);
          return reject(error);
        }
        resolve(result.secure_url);
      }
    );

    uploadStream.end(fileBuffer);
  });
};

module.exports = { uploadToCloudinary };
