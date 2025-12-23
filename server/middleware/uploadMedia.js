const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const MAX_MEDIA_BYTES = 50 * 1024 * 1024; // 50MB

const videoExtRe = /\.(mp4|webm|mov|m4v|mkv)$/i;
const imageExtRe = /\.(jpg|jpeg|png|gif|webp)$/i;

const allowedImageMimes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]);

const allowedVideoMimes = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime', // mov
  'video/x-matroska' // mkv (often)
]);

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const original = (file.originalname || '').toLowerCase();
    const isVideo = (file.mimetype && file.mimetype.startsWith('video/')) || videoExtRe.test(original);

    if (isVideo) {
      return {
        folder: 'connectin_posts',
        resource_type: 'video',
        allowed_formats: ['mp4', 'webm', 'mov', 'm4v', 'mkv'],
        // Keep video params minimal to reduce Cloudinary errors
      };
    }

    // images + gifs
    return {
      folder: 'connectin_posts',
      resource_type: 'image',
      allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp'],
      transformation: [{ width: 1400, crop: 'limit' }, { quality: 'auto' }]
    };
  }
});

const uploadMedia = multer({
  storage,
  limits: { fileSize: MAX_MEDIA_BYTES },
  fileFilter: (req, file, cb) => {
    const mime = file.mimetype;
    const original = (file.originalname || '').toLowerCase();
    const looksLikeVideo = (mime && mime.startsWith('video/')) || videoExtRe.test(original);
    const looksLikeImage = (mime && mime.startsWith('image/')) || imageExtRe.test(original);

    if (allowedImageMimes.has(mime) || allowedVideoMimes.has(mime) || looksLikeVideo || looksLikeImage) {
      return cb(null, true);
    }
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', `Unsupported file type: ${mime || 'unknown'}`));
  }
});

module.exports = uploadMedia;
