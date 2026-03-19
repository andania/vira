/**
 * Verification Controller
 * Handles HTTP requests for sponsor verification
 */

import { Request, Response } from 'express';
import { verificationService } from '../services/verification.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class VerificationController {
  /**
   * Submit verification request
   */
  async submitVerification(req: Request, res: Response) {
    try {
      const sponsorId = req.user?.id;
      if (!sponsorId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const { businessDetails, directorDetails } = req.body;
      const documents = req.files as Express.Multer.File[];

      if (!documents || documents.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'At least one document is required',
          },
        });
      }

      if (!businessDetails) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Business details are required',
          },
        });
      }

      const verification = await verificationService.submitVerification({
        sponsorId,
        documents: documents.map(file => ({
          type: file.fieldname as any,
          file,
        })),
        businessDetails,
        directorDetails: directorDetails || [],
      });

      return res.status(201).json({
        success: true,
        data: verification,
        message: 'Verification submitted successfully',
      });
    } catch (error) {
      logger.error('Error in submitVerification:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to submit verification',
        },
      });
    }
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(req: Request, res: Response) {
    try {
      const sponsorId = req.user?.id;
      if (!sponsorId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const status = await verificationService.getVerificationStatus(sponsorId);

      return res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      logger.error('Error in getVerificationStatus:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get verification status',
        },
      });
    }
  }

  /**
   * Process verification (admin only)
   */
  async processVerification(req: Request, res: Response) {
    try {
      const adminId = req.user?.id;
      const { verificationId } = req.params;
      const { approved, notes } = req.body;

      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      await verificationService.processVerification(verificationId, adminId, approved, notes);

      return res.json({
        success: true,
        message: `Verification ${approved ? 'approved' : 'rejected'} successfully`,
      });
    } catch (error) {
      logger.error('Error in processVerification:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to process verification',
        },
      });
    }
  }

  /**
   * Get pending verifications (admin only)
   */
  async getPendingVerifications(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const verifications = await verificationService.getPendingVerifications(limit, offset);

      return res.json({
        success: true,
        data: verifications,
      });
    } catch (error) {
      logger.error('Error in getPendingVerifications:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get pending verifications',
        },
      });
    }
  }

  /**
   * Get verification details (admin only)
   */
  async getVerificationDetails(req: Request, res: Response) {
    try {
      const { verificationId } = req.params;

      const verification = await verificationService.getVerificationDetails(verificationId);

      return res.json({
        success: true,
        data: verification,
      });
    } catch (error) {
      logger.error('Error in getVerificationDetails:', error);
      return res.status(404).json({
        success: false,
        error: {
          code: ApiErrorCode.RESOURCE_NOT_FOUND,
          message: error.message || 'Verification not found',
        },
      });
    }
  }

  /**
   * Request additional documents (admin only)
   */
  async requestAdditionalDocuments(req: Request, res: Response) {
    try {
      const adminId = req.user?.id;
      const { verificationId } = req.params;
      const { requestedDocs, message } = req.body;

      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      await verificationService.requestAdditionalDocuments(verificationId, adminId, requestedDocs, message);

      return res.json({
        success: true,
        message: 'Additional documents requested successfully',
      });
    } catch (error) {
      logger.error('Error in requestAdditionalDocuments:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to request additional documents',
        },
      });
    }
  }

  /**
   * Get verification statistics (admin only)
   */
  async getVerificationStats(req: Request, res: Response) {
    try {
      const stats = await verificationService.getVerificationStats();

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error in getVerificationStats:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get verification statistics',
        },
      });
    }
  }

  /**
   * Upload additional documents
   */
  async uploadAdditionalDocuments(req: Request, res: Response) {
    try {
      const sponsorId = req.user?.id;
      const documents = req.files as Express.Multer.File[];

      if (!sponsorId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      if (!documents || documents.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'At least one document is required',
          },
        });
      }

      // Get pending verification
      const pendingVerification = await prisma.sponsorVerification.findFirst({
        where: {
          sponsorId,
          status: 'additional_docs_required',
        },
      });

      if (!pendingVerification) {
        return res.status(404).json({
          success: false,
          error: {
            code: ApiErrorCode.RESOURCE_NOT_FOUND,
            message: 'No pending verification requiring documents found',
          },
        });
      }

      // Upload documents and update verification
      const uploadedDocs = [];
      for (const file of documents) {
        const uploadResult = await storageService.upload(file, {
          folder: `verification/${sponsorId}/additional`,
        });
        uploadedDocs.push({
          type: file.fieldname,
          url: uploadResult.url,
        });
      }

      await prisma.sponsorVerification.update({
        where: { id: pendingVerification.id },
        data: {
          documents: {
            push: uploadedDocs,
          },
          status: 'pending',
        },
      });

      return res.json({
        success: true,
        message: 'Additional documents uploaded successfully',
      });
    } catch (error) {
      logger.error('Error in uploadAdditionalDocuments:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to upload additional documents',
        },
      });
    }
  }
}

export const verificationController = new VerificationController();