/**
 * File Upload Utilities
 * For handling file uploads and processing
 */

import fs from 'fs';
import path from 'path';
import util from 'util';
import { v4 as uuidv4 } from 'uuid';
import { pipeline } from 'stream';
import { storageService } from '../lib/storage/storage.service';
import { logger } from '../core/logger';

const pump = util.promisify(pipeline);

export interface FileValidationOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  allowedExtensions?: string[];
  minSize?: number; // in bytes
}

export interface UploadedFileInfo {
  filename: string;
  originalName: string;
  path: string;
  size: number;
  mimeType: string;
  extension: string;
  url?: string;
}

/**
 * Validate file against options
 */
export const validateFile = (
  file: Express.Multer.File,
  options: FileValidationOptions = {}
): { valid: boolean; error?: string } => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    minSize = 0,
    allowedTypes = [],
    allowedExtensions = [],
  } = options;

  // Check size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB`,
    };
  }

  if (file.size < minSize) {
    return {
      valid: false,
      error: `File too small. Minimum size is ${minSize} bytes`,
    };
  }

  // Check MIME type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  // Check extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.length > 0 && !allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`,
    };
  }

  return { valid: true };
};

/**
 * Generate unique filename
 */
export const generateFilename = (originalName: string): string => {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const random = uuidv4().substring(0, 8);
  return `${timestamp}-${random}${ext}`;
};

/**
 * Upload file to storage
 */
export const uploadFile = async (
  file: Express.Multer.File,
  options: {
    folder?: string;
    filename?: string;
    validate?: FileValidationOptions;
    resize?: { width?: number; height?: number };
  } = {}
): Promise<UploadedFileInfo> => {
  // Validate if needed
  if (options.validate) {
    const validation = validateFile(file, options.validate);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
  }

  const filename = options.filename || generateFilename(file.originalname);
  
  const result = await storageService.upload(file, {
    folder: options.folder,
    filename,
    resize: options.resize,
  });

  return {
    filename,
    originalName: file.originalname,
    path: result.url,
    size: file.size,
    mimeType: file.mimetype,
    extension: path.extname(file.originalname),
    url: result.url,
  };
};

/**
 * Upload multiple files
 */
export const uploadMultipleFiles = async (
  files: Express.Multer.File[],
  options: {
    folder?: string;
    validate?: FileValidationOptions;
    resize?: { width?: number; height?: number };
  } = {}
): Promise<UploadedFileInfo[]> => {
  const results: UploadedFileInfo[] = [];

  for (const file of files) {
    try {
      const result = await uploadFile(file, options);
      results.push(result);
    } catch (error) {
      logger.error(`Error uploading file ${file.originalname}:`, error);
      // Continue with other files
    }
  }

  return results;
};

/**
 * Delete file
 */
export const deleteFile = async (fileUrl: string): Promise<boolean> => {
  return storageService.delete(fileUrl);
};

/**
 * Get file URL
 */
export const getFileUrl = (filePath: string): string => {
  if (filePath.startsWith('http')) {
    return filePath;
  }
  
  // Local file
  return `${process.env.API_URL}/uploads/${filePath}`;
};

/**
 * Get file info
 */
export const getFileInfo = async (fileUrl: string): Promise<any> => {
  return storageService.getInfo(fileUrl);
};

/**
 * Convert file to buffer
 */
export const fileToBuffer = (file: Express.Multer.File): Buffer => {
  return file.buffer;
};

/**
 * Save file locally (temporary)
 */
export const saveFileLocally = async (
  file: Express.Multer.File,
  destination?: string
): Promise<string> => {
  const uploadDir = destination || path.join(process.cwd(), 'uploads', 'temp');
  
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filename = generateFilename(file.originalname);
  const filePath = path.join(uploadDir, filename);

  const writeStream = fs.createWriteStream(filePath);
  await pump(file.buffer, writeStream);

  return filePath;
};

/**
 * Clean up temp files
 */
export const cleanupTempFiles = async (directory?: string): Promise<void> => {
  const tempDir = directory || path.join(process.cwd(), 'uploads', 'temp');
  
  if (fs.existsSync(tempDir)) {
    const files = fs.readdirSync(tempDir);
    
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      
      // Delete files older than 1 hour
      if (Date.now() - stats.mtimeMs > 60 * 60 * 1000) {
        fs.unlinkSync(filePath);
      }
    }
  }
};

/**
 * Get file extension from MIME type
 */
export const getExtensionFromMimeType = (mimeType: string): string => {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/ogg': '.ogv',
    'audio/mpeg': '.mp3',
    'audio/ogg': '.ogg',
    'audio/wav': '.wav',
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'text/plain': '.txt',
    'text/csv': '.csv',
    'application/json': '.json',
  };

  return map[mimeType] || '.bin';
};

/**
 * Get MIME type from extension
 */
export const getMimeTypeFromExtension = (ext: string): string => {
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.json': 'application/json',
  };

  return map[ext.toLowerCase()] || 'application/octet-stream';
};

/**
 * Check if file is an image
 */
export const isImage = (mimeType: string): boolean => {
  return mimeType.startsWith('image/');
};

/**
 * Check if file is a video
 */
export const isVideo = (mimeType: string): boolean => {
  return mimeType.startsWith('video/');
};

/**
 * Check if file is audio
 */
export const isAudio = (mimeType: string): boolean => {
  return mimeType.startsWith('audio/');
};

/**
 * Check if file is a document
 */
export const isDocument = (mimeType: string): boolean => {
  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ];
  
  return documentTypes.includes(mimeType);
};

/**
 * Format file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};