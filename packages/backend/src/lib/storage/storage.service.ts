/**
 * Storage Service
 * Main storage orchestration service
 */

import { config } from '../../../config';
import { logger } from '../../../core/logger';
import { s3Service } from './s3.service';
import { cloudinaryService } from './cloudinary.service';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

export interface UploadOptions {
  folder?: string;
  filename?: string;
  resize?: {
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  };
  formats?: string[];
  maxSize?: number;
  allowedTypes?: string[];
  isPublic?: boolean;
  metadata?: Record<string, any>;
}

export interface UploadResult {
  url: string;
  publicId?: string;
  filename: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
  format?: string;
  thumbnailUrl?: string;
}

export interface FileInfo {
  filename: string;
  path: string;
  size: number;
  mimeType: string;
  createdAt: Date;
}

export type StorageProvider = 's3' | 'cloudinary' | 'local';

export class StorageService {
  private provider: StorageProvider;
  private localBasePath: string;
  private baseUrl: string;

  constructor() {
    this.provider = (config.storageProvider as StorageProvider) || 'local';
    this.localBasePath = path.join(process.cwd(), 'uploads');
    this.baseUrl = config.apiUrl || 'http://localhost:3000';

    // Ensure local upload directory exists
    if (this.provider === 'local' && !fs.existsSync(this.localBasePath)) {
      fs.mkdirSync(this.localBasePath, { recursive: true });
    }

    logger.info(`✅ Storage service initialized with provider: ${this.provider}`);
  }

  /**
   * Upload a file
   */
  async upload(file: Express.Multer.File, options: UploadOptions = {}): Promise<UploadResult> {
    try {
      // Validate file
      this.validateFile(file, options);

      // Process image if needed
      let processedBuffer = file.buffer;
      let width: number | undefined;
      let height: number | undefined;

      if (file.mimetype.startsWith('image/') && options.resize) {
        const processed = await this.processImage(file.buffer, options.resize);
        processedBuffer = processed.buffer;
        width = processed.width;
        height = processed.height;
      }

      // Generate filename
      const filename = options.filename || this.generateFilename(file);

      // Upload based on provider
      switch (this.provider) {
        case 's3':
          return this.uploadToS3(processedBuffer, filename, file.mimetype, options);
        case 'cloudinary':
          return this.uploadToCloudinary(processedBuffer, filename, file.mimetype, options);
        case 'local':
        default:
          return this.uploadToLocal(processedBuffer, filename, file.mimetype, options);
      }
    } catch (error) {
      logger.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultiple(files: Express.Multer.File[], options: UploadOptions = {}): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    for (const file of files) {
      try {
        const result = await this.upload(file, options);
        results.push(result);
      } catch (error) {
        logger.error(`Error uploading file ${file.originalname}:`, error);
        // Continue with other files
      }
    }

    return results;
  }

  /**
   * Delete a file
   */
  async delete(fileUrl: string): Promise<boolean> {
    try {
      switch (this.provider) {
        case 's3':
          return this.deleteFromS3(fileUrl);
        case 'cloudinary':
          return this.deleteFromCloudinary(fileUrl);
        case 'local':
        default:
          return this.deleteFromLocal(fileUrl);
      }
    } catch (error) {
      logger.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * Get file info
   */
  async getInfo(fileUrl: string): Promise<FileInfo | null> {
    try {
      switch (this.provider) {
        case 's3':
          return this.getInfoFromS3(fileUrl);
        case 'cloudinary':
          return this.getInfoFromCloudinary(fileUrl);
        case 'local':
        default:
          return this.getInfoFromLocal(fileUrl);
      }
    } catch (error) {
      logger.error('Error getting file info:', error);
      return null;
    }
  }

  /**
   * Upload to local storage
   */
  private async uploadToLocal(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    options: UploadOptions
  ): Promise<UploadResult> {
    const folder = options.folder || 'general';
    const filePath = path.join(this.localBasePath, folder, filename);

    // Ensure folder exists
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    // Write file
    await fs.promises.writeFile(filePath, buffer);

    const url = `${this.baseUrl}/uploads/${folder}/${filename}`;

    return {
      url,
      filename,
      size: buffer.length,
      mimeType,
      format: path.extname(filename).substring(1),
    };
  }

  /**
   * Upload to S3
   */
  private async uploadToS3(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    options: UploadOptions
  ): Promise<UploadResult> {
    return s3Service.upload(buffer, filename, mimeType, options);
  }

  /**
   * Upload to Cloudinary
   */
  private async uploadToCloudinary(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    options: UploadOptions
  ): Promise<UploadResult> {
    return cloudinaryService.upload(buffer, filename, mimeType, options);
  }

  /**
   * Delete from local storage
   */
  private async deleteFromLocal(fileUrl: string): Promise<boolean> {
    try {
      const filePath = this.getLocalPathFromUrl(fileUrl);
      await fs.promises.unlink(filePath);
      return true;
    } catch (error) {
      logger.error('Error deleting local file:', error);
      return false;
    }
  }

  /**
   * Delete from S3
   */
  private async deleteFromS3(fileUrl: string): Promise<boolean> {
    return s3Service.delete(fileUrl);
  }

  /**
   * Delete from Cloudinary
   */
  private async deleteFromCloudinary(fileUrl: string): Promise<boolean> {
    return cloudinaryService.delete(fileUrl);
  }

  /**
   * Get info from local storage
   */
  private async getInfoFromLocal(fileUrl: string): Promise<FileInfo | null> {
    try {
      const filePath = this.getLocalPathFromUrl(fileUrl);
      const stats = await fs.promises.stat(filePath);
      
      return {
        filename: path.basename(filePath),
        path: filePath,
        size: stats.size,
        mimeType: this.getMimeType(filePath),
        createdAt: stats.birthtime,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get info from S3
   */
  private async getInfoFromS3(fileUrl: string): Promise<FileInfo | null> {
    return s3Service.getInfo(fileUrl);
  }

  /**
   * Get info from Cloudinary
   */
  private async getInfoFromCloudinary(fileUrl: string): Promise<FileInfo | null> {
    return cloudinaryService.getInfo(fileUrl);
  }

  /**
   * Generate unique filename
   */
  private generateFilename(file: Express.Multer.File): string {
    const ext = path.extname(file.originalname);
    const timestamp = Date.now();
    const random = uuidv4().substring(0, 8);
    return `${timestamp}-${random}${ext}`;
  }

  /**
   * Validate file
   */
  private validateFile(file: Express.Multer.File, options: UploadOptions): void {
    // Check file size
    if (options.maxSize && file.size > options.maxSize) {
      throw new Error(`File too large. Max size: ${options.maxSize / 1024 / 1024}MB`);
    }

    // Check file type
    if (options.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
      throw new Error(`File type not allowed. Allowed: ${options.allowedTypes.join(', ')}`);
    }
  }

  /**
   * Process image (resize, convert, etc.)
   */
  private async processImage(
    buffer: Buffer,
    resize: { width?: number; height?: number; fit?: string }
  ): Promise<{ buffer: Buffer; width: number; height: number }> {
    let sharpInstance = sharp(buffer);

    if (resize.width || resize.height) {
      sharpInstance = sharpInstance.resize({
        width: resize.width,
        height: resize.height,
        fit: resize.fit as keyof sharp.FitEnum || 'cover',
        withoutEnlargement: true,
      });
    }

    const metadata = await sharpInstance.metadata();
    const processedBuffer = await sharpInstance.toBuffer();

    return {
      buffer: processedBuffer,
      width: metadata.width || 0,
      height: metadata.height || 0,
    };
  }

  /**
   * Get local path from URL
   */
  private getLocalPathFromUrl(url: string): string {
    const urlPath = new URL(url).pathname;
    const relativePath = urlPath.replace('/uploads/', '');
    return path.join(this.localBasePath, relativePath);
  }

  /**
   * Get MIME type from file path
   */
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
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
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Get file extension from MIME type
   */
  getExtension(mimeType: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    };
    return extensions[mimeType] || '.bin';
  }

  /**
   * Check if file is an image
   */
  isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  /**
   * Check if file is a video
   */
  isVideo(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  /**
   * Check if file is audio
   */
  isAudio(mimeType: string): boolean {
    return mimeType.startsWith('audio/');
  }

  /**
   * Check if file is a document
   */
  isDocument(mimeType: string): boolean {
    return mimeType === 'application/pdf' ||
           mimeType.includes('word') ||
           mimeType.includes('excel') ||
           mimeType.includes('presentation');
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<any> {
    if (this.provider === 'local') {
      return this.getLocalStorageStats();
    } else if (this.provider === 's3') {
      return s3Service.getStats();
    } else if (this.provider === 'cloudinary') {
      return cloudinaryService.getStats();
    }
    return null;
  }

  /**
   * Get local storage statistics
   */
  private async getLocalStorageStats(): Promise<any> {
    const stats = {
      totalSize: 0,
      fileCount: 0,
      byType: {} as Record<string, number>,
    };

    const walkDir = async (dir: string) => {
      const files = await fs.promises.readdir(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = await fs.promises.stat(filePath);

        if (stat.isDirectory()) {
          await walkDir(filePath);
        } else {
          stats.totalSize += stat.size;
          stats.fileCount++;

          const ext = path.extname(file).toLowerCase();
          stats.byType[ext] = (stats.byType[ext] || 0) + 1;
        }
      }
    };

    await walkDir(this.localBasePath);

    return stats;
  }
}

export const storageService = new StorageService();