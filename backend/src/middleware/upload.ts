import multer from 'multer';

// Use memory storage for fast processing and easy future forwarding to OCR microservice
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});
