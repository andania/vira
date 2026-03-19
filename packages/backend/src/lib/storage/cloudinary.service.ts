/**
 * Cloudinary Storage Service
 * Handles image/video storage with Cloudinary
 */

import { v2 as cloudinary } from 'cloudinary';
import { config } from '../../../config';
import { logger } from '../../../core/logger';
import { UploadOptions, UploadResult, FileInfo } from './storage.service';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import streamifier from 'streamifier';

export class CloudinaryService {
  private cloudName: string;
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    if (!config.cloudinaryCloudName || !config.cloudinaryApiKey || !config.cloudinaryApiSecret) {
      throw new Error('Cloudinary credentials not configured');
    }

    this.cloudName = config.cloudinaryCloudName;
    this.apiKey = config.cloudinaryApiKey;
    this.apiSecret = config.cloudinaryApiSecret;

    cloudinary.config({
      cloud_name: this.cloudName,
      api_key: this.apiKey,
      api_secret: this.apiSecret,
    });

    logger.info('✅ Cloudinary client initialized');
  }

  /**
   * Upload file to Cloudinary
   */
  async upload(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const folder = options.folder || 'general';
      const publicId = `${folder}/${uuidv4()}-${path.parse(filename).name}`;

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          resource_type: this.getResourceType(mimeType),
          folder,
          transformation: this.getTransformations(options),
          tags: options.metadata?.tags,
          context: options.metadata,
        },
        (error, result) => {
          if (error) {
            logger.error('Error uploading to Cloudinary:', error);
            reject(error);
          } else if (result) {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              filename: result.public_id + path.extname(result.secure_url),
              size: result.bytes,
              mimeType: result.resource_type + '/' + result.format,
              width: result.width,
              height: result.height,
              format: result.format,
              thumbnailUrl: this.getThumbnailUrl(result.public_id, result.format),
            });
          }
        }
      );

      streamifier.createReadStream(buffer).pipe(uploadStream);
    });
  }

  /**
   * Delete file from Cloudinary
   */
  async delete(fileUrl: string): Promise<boolean> {
    try {
      const publicId = this.getPublicIdFromUrl(fileUrl);

      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      logger.error('Error deleting from Cloudinary:', error);
      return false;
    }
  }

  /**
   * Get file info from Cloudinary
   */
  async getInfo(fileUrl: string): Promise<FileInfo | null> {
    try {
      const publicId = this.getPublicIdFromUrl(fileUrl);

      const result = await cloudinary.api.resource(publicId);

      return {
        filename: result.public_id + '.' + result.format,
        path: result.public_id,
        size: result.bytes,
        mimeType: result.resource_type + '/' + result.format,
        createdAt: new Date(result.created_at),
      };
    } catch (error) {
      logger.error('Error getting Cloudinary file info:', error);
      return null;
    }
  }

  /**
   * Get resource type from MIME type
   */
  private getResourceType(mimeType: string): 'image' | 'video' | 'raw' {
    if (mimeType.startsWith('image/')) {
      return 'image';
    } else if (mimeType.startsWith('video/')) {
      return 'video';
    } else {
      return 'raw';
    }
  }

  /**
   * Get transformations from options
   */
  private getTransformations(options: UploadOptions): any {
    const transformations: any = {};

    if (options.resize) {
      transformations.width = options.resize.width;
      transformations.height = options.resize.height;
      transformations.crop = options.resize.fit || 'limit';
    }

    if (options.formats) {
      // This would be handled differently in Cloudinary
    }

    return transformations;
  }

  /**
   * Get thumbnail URL
   */
  private getThumbnailUrl(publicId: string, format: string): string {
    return cloudinary.url(publicId, {
      width: 200,
      height: 200,
      crop: 'fill',
      format: 'jpg',
    });
  }

  /**
   * Get public ID from Cloudinary URL
   */
  private getPublicIdFromUrl(url: string): string {
    // Example URL: https://res.cloudinary.com/cloudname/image/upload/v1234567890/folder/file.jpg
    const matches = url.match(/\/upload\/(?:v\d+\/)?(.+?)\./);
    return matches ? matches[1] : '';
  }

  /**
   * Generate optimized URL
   */
  getOptimizedUrl(publicId: string, options: { width?: number; height?: number; quality?: number } = {}): string {
    return cloudinary.url(publicId, {
      width: options.width,
      height: options.height,
      quality: options.quality || 'auto',
      fetch_format: 'auto',
      crop: 'limit',
    });
  }

  /**
   * Generate responsive image URLs
   */
  getResponsiveUrls(publicId: string, sizes: number[]): string[] {
    return sizes.map(size =>
      cloudinary.url(publicId, {
        width: size,
        quality: 'auto',
        fetch_format: 'auto',
        crop: 'scale',
      })
    );
  }

  /**
   * Get video player
   */
  getVideoPlayer(publicId: string, options: { controls?: boolean; autoplay?: boolean } = {}): string {
    return cloudinary.url(publicId, {
      resource_type: 'video',
      controls: options.controls,
      autoplay: options.autoplay,
    });
  }

  /**
   * Generate video thumbnail
   */
  getVideoThumbnail(publicId: string, time: number = 1): string {
    return cloudinary.url(publicId, {
      resource_type: 'video',
      format: 'jpg',
      start_offset: time,
    });
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<any> {
    try {
      const result = await cloudinary.api.usage();
      return {
        provider: 'cloudinary',
        plan: result.plan,
        credits: result.credits,
        usage: result.usage,
      };
    } catch (error) {
      logger.error('Error getting Cloudinary stats:', error);
      return null;
    }
  }

  /**
   * Search resources
   */
  async search(query: string, options: { maxResults?: number; nextCursor?: string } = {}): Promise<any> {
    try {
      const result = await cloudinary.search
        .expression(query)
        .max_results(options.maxResults || 10)
        .next_cursor(options.nextCursor)
        .execute();

      return result;
    } catch (error) {
      logger.error('Error searching Cloudinary:', error);
      throw error;
    }
  }

  /**
   * Create folder
   */
  async createFolder(folder: string): Promise<boolean> {
    try {
      await cloudinary.api.create_folder(folder);
      return true;
    } catch (error) {
      logger.error('Error creating Cloudinary folder:', error);
      return false;
    }
  }

  /**
   * Delete folder
   */
  async deleteFolder(folder: string): Promise<boolean> {
    try {
      await cloudinary.api.delete_folder(folder);
      return true;
    } catch (error) {
      logger.error('Error deleting Cloudinary folder:', error);
      return false;
    }
  }
}

export const cloudinaryService = new CloudinaryService();