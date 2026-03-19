/**
 * Upload Middleware
 * File upload handling with Multer
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';
import { ApiError } from './error.middleware';
import { ApiErrorCode } from '@viraz/shared';

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create subdirectories based on file type
    let subDir = 'others';
    if (file.mimetype.startsWith('image/')) {
      subDir = 'images';
    } else if (file.mimetype.startsWith('video/')) {
      subDir = 'videos';
    } else if (file.mimetype.startsWith('audio/')) {
      subDir = 'audio';
    } else if (file.mimetype === 'application/pdf') {
      subDir = 'documents';
    }

    const dir = path.join(uploadDir, subDir);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  },
});

// File filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allowed MIME types
  const allowedMimes = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    video: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
    audio: ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  };

  // Check file type
  for (const [type, mimes] of Object.entries(allowedMimes)) {
    if (mimes.includes(file.mimetype)) {
      return cb(null, true);
    }
  }

  cb(new ApiError(
    'Invalid file type',
    400,
    ApiErrorCode.INVALID_FILE_TYPE,
    { allowedTypes: Object.values(allowedMimes).flat() }
  ));
};

// Multer configuration
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB default
    files: 10, // Max 10 files at once
  },
});

/**
 * Configure upload with custom options
 */
export const configureUpload = (options: {
  maxSize?: number;
  maxFiles?: number;
  allowedTypes?: string[];
}) => {
  const { maxSize = 10 * 1024 * 1024, maxFiles = 10, allowedTypes } = options;

  const customFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (allowedTypes && !allowedTypes.includes(file.mimetype)) {
      cb(new ApiError(
        'Invalid file type',
        400,
        ApiErrorCode.INVALID_FILE_TYPE,
        { allowedTypes }
      ));
    } else {
      cb(null, true);
    }
  };

  return multer({
    storage,
    fileFilter: allowedTypes ? customFileFilter : fileFilter,
    limits: {
      fileSize: maxSize,
      files: maxFiles,
    },
  });
};

// Pre-configured upload instances
export const uploadSingle = upload.single('file');
export const uploadArray = upload.array('files', 10);
export const uploadFields = upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
  { name: 'images', maxCount: 10 },
  { name: 'videos', maxCount: 5 },
  { name: 'documents', maxCount: 5 },
]);

// Image upload with specific limits
export const uploadImage = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new ApiError('Only image files are allowed', 400, ApiErrorCode.INVALID_FILE_TYPE));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB for images
    files: 5,
  },
}).array('images', 5);

// Video upload with specific limits
export const uploadVideo = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new ApiError('Only video files are allowed', 400, ApiErrorCode.INVALID_FILE_TYPE));
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB for videos
    files: 3,
  },
}).array('videos', 3);

// Document upload with specific limits
export const uploadDocument = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedDocs = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedDocs.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ApiError('Only PDF and Word documents are allowed', 400, ApiErrorCode.INVALID_FILE_TYPE));
    }
  },
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB for documents
    files: 5,
  },
}).array('documents', 5);