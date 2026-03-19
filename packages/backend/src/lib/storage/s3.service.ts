/**
 * S3 Storage Service
 * Handles file storage with AWS S3
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../../../config';
import { logger } from '../../../core/logger';
import { UploadOptions, UploadResult, FileInfo } from './storage.service';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

export class S3Service {
  private client: S3Client;
  private bucket: string;
  private region: string;
  private baseUrl: string;

  constructor() {
    if (!config.awsAccessKeyId || !config.awsSecretAccessKey || !config.awsS3Bucket) {
      throw new Error('AWS credentials not configured');
    }

    this.region = config.awsRegion || 'us-east-1';
    this.bucket = config.awsS3Bucket;
    this.baseUrl = `https://${this.bucket}.s3.${this.region}.amazonaws.com`;

    this.client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: config.awsAccessKeyId,
        secretAccessKey: config.awsSecretAccessKey,
      },
    });

    logger.info('✅ S3 client initialized');
  }

  /**
   * Upload file to S3
   */
  async upload(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      const folder = options.folder || 'general';
      const key = `${folder}/${filename}`;

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ACL: options.isPublic ? 'public-read' : 'private',
        Metadata: options.metadata,
      });

      await this.client.send(command);

      const url = `${this.baseUrl}/${key}`;

      return {
        url,
        filename,
        size: buffer.length,
        mimeType,
        format: path.extname(filename).substring(1),
      };
    } catch (error) {
      logger.error('Error uploading to S3:', error);
      throw error;
    }
  }

  /**
   * Delete file from S3
   */
  async delete(fileUrl: string): Promise<boolean> {
    try {
      const key = this.getKeyFromUrl(fileUrl);

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      logger.error('Error deleting from S3:', error);
      return false;
    }
  }

  /**
   * Get file info from S3
   */
  async getInfo(fileUrl: string): Promise<FileInfo | null> {
    try {
      const key = this.getKeyFromUrl(fileUrl);

      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.client.send(command);

      return {
        filename: path.basename(key),
        path: key,
        size: response.ContentLength || 0,
        mimeType: response.ContentType || 'application/octet-stream',
        createdAt: response.LastModified || new Date(),
      };
    } catch (error) {
      logger.error('Error getting S3 file info:', error);
      return null;
    }
  }

  /**
   * Generate presigned URL for temporary access
   */
  async getPresignedUrl(fileUrl: string, expiresIn: number = 3600): Promise<string | null> {
    try {
      const key = this.getKeyFromUrl(fileUrl);

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.client, command, { expiresIn });
      return url;
    } catch (error) {
      logger.error('Error generating presigned URL:', error);
      return null;
    }
  }

  /**
   * Get key from S3 URL
   */
  private getKeyFromUrl(url: string): string {
    const urlObj = new URL(url);
    return urlObj.pathname.substring(1); // Remove leading slash
  }

  /**
   * List files in folder
   */
  async listFiles(folder: string, prefix?: string): Promise<string[]> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Prefix: folder + (prefix ? `/${prefix}` : ''),
      });

      // This would use ListObjectsV2Command, simplified for now
      return [];
    } catch (error) {
      logger.error('Error listing S3 files:', error);
      return [];
    }
  }

  /**
   * Copy file
   */
  async copy(sourceUrl: string, destinationKey: string): Promise<string | null> {
    try {
      const sourceKey = this.getKeyFromUrl(sourceUrl);

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: destinationKey,
        CopySource: `${this.bucket}/${sourceKey}`,
      });

      await this.client.send(command);
      return `${this.baseUrl}/${destinationKey}`;
    } catch (error) {
      logger.error('Error copying S3 file:', error);
      return null;
    }
  }

  /**
   * Move file
   */
  async move(sourceUrl: string, destinationKey: string): Promise<string | null> {
    try {
      const newUrl = await this.copy(sourceUrl, destinationKey);
      if (newUrl) {
        await this.delete(sourceUrl);
      }
      return newUrl;
    } catch (error) {
      logger.error('Error moving S3 file:', error);
      return null;
    }
  }

  /**
   * Check if file exists
   */
  async exists(fileUrl: string): Promise<boolean> {
    try {
      const info = await this.getInfo(fileUrl);
      return info !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get file size
   */
  async getSize(fileUrl: string): Promise<number | null> {
    const info = await this.getInfo(fileUrl);
    return info?.size || null;
  }

  /**
   * Get bucket statistics
   */
  async getStats(): Promise<any> {
    // This would require listing all objects, simplified for now
    return {
      provider: 's3',
      bucket: this.bucket,
      region: this.region,
    };
  }

  /**
   * Generate upload URL for client-side uploads
   */
  async getUploadUrl(
    filename: string,
    mimeType: string,
    folder: string = 'uploads'
  ): Promise<{ url: string; key: string }> {
    const key = `${folder}/${uuidv4()}-${filename}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mimeType,
    });

    const url = await getSignedUrl(this.client, command, { expiresIn: 3600 });

    return { url, key };
  }
}

export const s3Service = new S3Service();