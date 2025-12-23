const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;

function detectMediaType(file) {
  if (!file) return null;
  if (file.mimetype) {
    if (file.mimetype.startsWith('video/')) return 'video';
    if (file.mimetype.startsWith('image/')) return 'image';
  }
  if (file.path && VIDEO_EXT_RE.test(file.path)) return 'video';
  return 'image';
}

module.exports = { detectMediaType };
