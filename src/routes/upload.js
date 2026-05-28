const router = require('express').Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const { authenticate, authorize } = require('../middleware/auth');

// Initialize Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer to use Cloudinary Storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'silkthread_uploads', // Optional: creates a folder in your Cloudinary account
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

// POST /api/upload — admin or authenticated users
router.post('/', authenticate, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    // multer-storage-cloudinary attaches 'path' with the Cloudinary URL
    const url = req.file.path;
    res.json({ url, filename: req.file.filename });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Error handler for multer
router.use((err, req, res, next) => {
  console.error('Multer/Upload Error:', err);
  if (err instanceof multer.MulterError || err.message) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

module.exports = router;
