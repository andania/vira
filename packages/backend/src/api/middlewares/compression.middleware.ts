/**
 * Compression Middleware
 * Response compression using gzip/deflate
 */

import compression from 'compression';
import { Request, Response } from 'express';

/**
 * Compression options
 */
const compressionOptions = {
  // Compression level (1-9, 1 is fastest, 9 is best compression)
  level: 6,

  // Only compress responses above this threshold (1kb)
  threshold: 1024,

  // Filter function to determine if response should be compressed
  filter: (req: Request, res: Response) => {
    // Skip compression if client doesn't accept it
    if (req.headers['accept-encoding']?.includes('gzip')) {
      return true;
    }
    
    // Skip compression for SSE or streaming responses
    if (res.getHeader('Content-Type') === 'text/event-stream') {
      return false;
    }

    // Default to compression
    return true;
  },

  // Cache compressed responses
  memLevel: 8, // Memory level for compression (1-9)

  // Chunk size for compression
  chunkSize: 16 * 1024, // 16kb chunks

  // Window bits for compression
  windowBits: 15, // Maximum window size

  // Compression strategy
  strategy: 0, // Default strategy
};

/**
 * Compression middleware
 */
export const compress = compression(compressionOptions);

/**
 * Skip compression for specific content types
 */
export const skipCompressionForTypes = (types: string[]) => {
  return (req: Request, res: Response) => {
    const contentType = res.getHeader('Content-Type') as string;
    return types.some(type => contentType?.includes(type));
  };
};

/**
 * Force compression even for small responses
 */
export const forceCompression = compression({
  ...compressionOptions,
  threshold: 0, // Compress everything
});

/**
 * No compression (for debugging)
 */
export const noCompression = (req: Request, res: Response, next: Function) => {
  res.setHeader('X-Compression', 'disabled');
  next();
};