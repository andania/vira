/**
 * Storage Configuration
 * S3, Cloudinary, and local file storage
 */

import { config } from './index';

export const storageConfig = {
  // Default provider
  defaultProvider: (config.awsAccessKeyId && config.awsS3Bucket) ? 's3' : 
                   (config.cloudinaryCloudName) ? 'cloudinary' : 'local',

  // AWS S3 Configuration
  s3: {
    enabled: !!(config.awsAccessKeyId && config.awsS3Bucket),
    accessKeyId: config.awsAccessKeyId,
    secretAccessKey: config.awsSecretAccessKey,
    region: config.awsRegion || 'us-east-1',
    bucket: config.awsS3Bucket,
    endpoint: process.env.AWS_S3_ENDPOINT,
    forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true',
    acl: 'public-read',
    cacheControl: 'max-age=31536000',
    expires: 7 * 24 * 60 * 60, // 7 days

    // Folders
    folders: {
      avatars: 'avatars',
      covers: 'covers',
      products: 'products',
      ads: 'ads',
      rooms: 'rooms',
      documents: 'documents',
      temp: 'temp',
    },

    // URL format
    urlFormat: 'cloudfront', // cloudfront, s3, custom
    cloudfrontDomain: process.env.CLOUDFRONT_DOMAIN,
    customDomain: process.env.S3_CUSTOM_DOMAIN,
  },

  // Cloudinary Configuration
  cloudinary: {
    enabled: !!config.cloudinaryCloudName,
    cloudName: config.cloudinaryCloudName,
    apiKey: config.cloudinaryApiKey,
    apiSecret: config.cloudinaryApiSecret,
    secure: true,

    // Upload presets
    presets: {
      avatar: 'viraz_avatars',
      product: 'viraz_products',
      ad: 'viraz_ads',
      room: 'viraz_rooms',
    },

    // Transformations
    transformations: {
      avatar: { width: 200, height: 200, crop: 'fill', gravity: 'face' },
      cover: { width: 1200, height: 400, crop: 'fill' },
      product: { width: 800, height: 800, crop: 'fill' },
      thumbnail: { width: 200, height: 200, crop: 'fill' },
    },
  },

  // Local Storage (for development)
  local: {
    enabled: true,
    path: './uploads',
    baseUrl: '/uploads',
    maxSize: 100 * 1024 * 1024, // 100MB

    folders: {
      avatars: 'avatars',
      covers: 'covers',
      products: 'products',
      ads: 'ads',
      rooms: 'rooms',
      documents: 'documents',
      temp: 'temp',
    },
  },

  // File upload limits
  limits: {
    avatar: {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      maxWidth: 2000,
      maxHeight: 2000,
    },
    cover: {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      maxWidth: 3000,
      maxHeight: 1000,
    },
    product: {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      maxFiles: 10,
    },
    ad: {
      image: {
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      },
      video: {
        maxSize: 100 * 1024 * 1024, // 100MB
        allowedTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
        maxDuration: 60, // 60 seconds
      },
    },
    document: {
      maxSize: 20 * 1024 * 1024, // 20MB
      allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    },
  },

  // Image optimization
  optimization: {
    enabled: true,
    quality: 80,
    formats: ['webp', 'jpeg'],
    sizes: {
      thumbnail: { width: 200, height: 200 },
      small: { width: 400 },
      medium: { width: 800 },
      large: { width: 1200 },
    },
  },

  // Video processing
  video: {
    enabled: true,
    formats: ['mp4', 'webm'],
    qualities: [
      { label: '1080p', resolution: '1920x1080', bitrate: 5000 },
      { label: '720p', resolution: '1280x720', bitrate: 2500 },
      { label: '480p', resolution: '854x480', bitrate: 1000 },
    ],
    maxDuration: 300, // 5 minutes
    thumbnailInterval: 10, // Generate thumbnail every 10 seconds
  },

  // CDN Configuration
  cdn: {
    enabled: config.nodeEnv === 'production',
    provider: 'cloudflare', // cloudflare, fastly, akamai
    domain: process.env.CDN_DOMAIN,
    purgeOnUpdate: true,
  },

  // Security
  security: {
    scanFiles: config.nodeEnv === 'production',
    virusScan: process.env.ENABLE_VIRUS_SCAN === 'true',
    allowedDomains: process.env.ALLOWED_UPLOAD_DOMAINS?.split(',') || [],
    maxFileAge: 7 * 24 * 60 * 60, // 7 days for temp files
  },
};

export default storageConfig;