/**
 * Storage Library Index
 * Exports storage-related services and types
 */

export { storageService, StorageService } from './storage.service';
export { s3Service, S3Service } from './s3.service';
export { cloudinaryService, CloudinaryService } from './cloudinary.service';

export type {
  UploadOptions,
  UploadResult,
  FileInfo,
  StorageProvider,
} from './storage.service';

// Available storage providers
export const storageProviders = {
  S3: 's3',
  CLOUDINARY: 'cloudinary',
  LOCAL: 'local',
} as const;

export type StorageProviderType = typeof storageProviders[keyof typeof storageProviders];

// File type categories
export const fileCategories = {
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  DOCUMENT: 'document',
  OTHER: 'other',
} as const;

export type FileCategory = typeof fileCategories[keyof typeof fileCategories];

// Allowed MIME types by category
export const allowedMimeTypes = {
  [fileCategories.IMAGE]: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  [fileCategories.VIDEO]: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
  [fileCategories.AUDIO]: ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm'],
  [fileCategories.DOCUMENT]: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
} as const;

// File size limits (in bytes)
export const fileSizeLimits = {
  [fileCategories.IMAGE]: 5 * 1024 * 1024, // 5MB
  [fileCategories.VIDEO]: 100 * 1024 * 1024, // 100MB
  [fileCategories.AUDIO]: 20 * 1024 * 1024, // 20MB
  [fileCategories.DOCUMENT]: 10 * 1024 * 1024, // 10MB
  [fileCategories.OTHER]: 10 * 1024 * 1024, // 10MB
} as const;

// Image optimization presets
export const imagePresets = {
  THUMBNAIL: { width: 200, height: 200, fit: 'cover' },
  SMALL: { width: 400, fit: 'inside' },
  MEDIUM: { width: 800, fit: 'inside' },
  LARGE: { width: 1200, fit: 'inside' },
  BANNER: { width: 1200, height: 400, fit: 'cover' },
  AVATAR: { width: 200, height: 200, fit: 'cover' },
} as const;

export type ImagePreset = keyof typeof imagePresets;