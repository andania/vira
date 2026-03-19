/**
 * Verification Service
 * Handles sponsor verification and KYC processes
 */

import { prisma } from '../../../../../core/database/client';
import { logger } from '../../../../../core/logger';
import { notificationService } from '../../notifications/services/notification.service';
import { storageService } from '../../../../../lib/storage/storage.service';

export interface VerificationDocument {
  type: 'business_registration' | 'tax_id' | 'proof_of_address' | 'director_id' | 'bank_statement';
  file: Express.Multer.File;
  documentNumber?: string;
  expiryDate?: Date;
}

export interface VerificationRequest {
  sponsorId: string;
  documents: VerificationDocument[];
  businessDetails: {
    legalName: string;
    registrationNumber: string;
    taxId?: string;
    businessAddress: string;
    businessPhone: string;
    businessEmail: string;
    website?: string;
    yearEstablished?: number;
    numberOfEmployees?: number;
    businessType: string;
    businessCategory: string;
  };
  directorDetails: {
    fullName: string;
    dateOfBirth: Date;
    nationality: string;
    idNumber: string;
    address: string;
    phone: string;
    email: string;
    position: string;
  }[];
}

export class VerificationService {
  /**
   * Submit verification request
   */
  async submitVerification(request: VerificationRequest) {
    try {
      const { sponsorId, documents, businessDetails, directorDetails } = request;

      // Check if already verified or pending
      const sponsor = await prisma.sponsor.findUnique({
        where: { id: sponsorId },
      });

      if (!sponsor) {
        throw new Error('Sponsor not found');
      }

      if (sponsor.verificationStatus === 'verified') {
        throw new Error('Sponsor already verified');
      }

      if (sponsor.verificationStatus === 'pending') {
        throw new Error('Verification already in progress');
      }

      // Upload documents
      const documentUrls = await this.uploadDocuments(sponsorId, documents);

      // Create verification record
      const verification = await prisma.sponsorVerification.create({
        data: {
          sponsorId,
          status: 'pending',
          documents: documentUrls,
          businessDetails,
          directorDetails,
          submittedAt: new Date(),
        },
      });

      // Update sponsor status
      await prisma.sponsor.update({
        where: { id: sponsorId },
        data: { verificationStatus: 'pending' },
      });

      // Notify admins
      await this.notifyAdmins(sponsorId);

      logger.info(`Verification submitted for sponsor ${sponsorId}`);
      return verification;
    } catch (error) {
      logger.error('Error submitting verification:', error);
      throw error;
    }
  }

  /**
   * Upload verification documents
   */
  private async uploadDocuments(sponsorId: string, documents: VerificationDocument[]): Promise<any[]> {
    const uploadedDocs = [];

    for (const doc of documents) {
      const uploadResult = await storageService.upload(doc.file, {
        folder: `verification/${sponsorId}`,
        allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSize: 10 * 1024 * 1024, // 10MB
      });

      uploadedDocs.push({
        type: doc.type,
        url: uploadResult.url,
        documentNumber: doc.documentNumber,
        expiryDate: doc.expiryDate,
        uploadedAt: new Date(),
      });
    }

    return uploadedDocs;
  }

  /**
   * Process verification (admin)
   */
  async processVerification(
    verificationId: string,
    adminId: string,
    approved: boolean,
    notes?: string
  ) {
    try {
      const verification = await prisma.sponsorVerification.findUnique({
        where: { id: verificationId },
        include: { sponsor: true },
      });

      if (!verification) {
        throw new Error('Verification not found');
      }

      // Update verification status
      await prisma.sponsorVerification.update({
        where: { id: verificationId },
        data: {
          status: approved ? 'approved' : 'rejected',
          processedBy: adminId,
          processedAt: new Date(),
          adminNotes: notes,
        },
      });

      // Update sponsor status
      await prisma.sponsor.update({
        where: { id: verification.sponsorId },
        data: {
          verificationStatus: approved ? 'verified' : 'rejected',
          verifiedBy: approved ? adminId : null,
          verifiedAt: approved ? new Date() : null,
        },
      });

      // Send notification to sponsor
      await notificationService.create({
        userId: verification.sponsorId,
        type: 'SYSTEM',
        title: approved ? '✅ Verification Approved' : '❌ Verification Rejected',
        body: approved
          ? 'Your sponsor account has been verified. You can now create campaigns.'
          : `Your verification was rejected. Reason: ${notes || 'Please contact support for more information.'}`,
        data: {
          screen: 'sponsor',
          action: 'verification',
        },
      });

      logger.info(`Verification ${verificationId} ${approved ? 'approved' : 'rejected'} by ${adminId}`);
    } catch (error) {
      logger.error('Error processing verification:', error);
      throw error;
    }
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(sponsorId: string) {
    try {
      const verification = await prisma.sponsorVerification.findFirst({
        where: { sponsorId },
        orderBy: { submittedAt: 'desc' },
      });

      if (!verification) {
        return { status: 'not_submitted' };
      }

      return {
        status: verification.status,
        submittedAt: verification.submittedAt,
        processedAt: verification.processedAt,
        notes: verification.adminNotes,
      };
    } catch (error) {
      logger.error('Error getting verification status:', error);
      throw error;
    }
  }

  /**
   * Get verification details (admin)
   */
  async getVerificationDetails(verificationId: string) {
    try {
      const verification = await prisma.sponsorVerification.findUnique({
        where: { id: verificationId },
        include: {
          sponsor: {
            include: {
              user: {
                select: {
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
      });

      if (!verification) {
        throw new Error('Verification not found');
      }

      return verification;
    } catch (error) {
      logger.error('Error getting verification details:', error);
      throw error;
    }
  }

  /**
   * Get pending verifications (admin)
   */
  async getPendingVerifications(limit: number = 50, offset: number = 0) {
    try {
      const [verifications, total] = await Promise.all([
        prisma.sponsorVerification.findMany({
          where: { status: 'pending' },
          include: {
            sponsor: {
              include: {
                user: {
                  select: {
                    email: true,
                    phone: true,
                  },
                },
              },
            },
          },
          orderBy: { submittedAt: 'asc' },
          take: limit,
          skip: offset,
        }),
        prisma.sponsorVerification.count({ where: { status: 'pending' } }),
      ]);

      return { verifications, total };
    } catch (error) {
      logger.error('Error getting pending verifications:', error);
      throw error;
    }
  }

  /**
   * Request additional documents
   */
  async requestAdditionalDocuments(verificationId: string, adminId: string, requestedDocs: string[], message: string) {
    try {
      await prisma.sponsorVerification.update({
        where: { id: verificationId },
        data: {
          status: 'additional_docs_required',
          adminNotes: message,
          processedBy: adminId,
          processedAt: new Date(),
        },
      });

      const verification = await prisma.sponsorVerification.findUnique({
        where: { id: verificationId },
        select: { sponsorId: true },
      });

      if (verification) {
        await notificationService.create({
          userId: verification.sponsorId,
          type: 'SYSTEM',
          title: '📋 Additional Documents Required',
          body: message,
          data: {
            screen: 'sponsor',
            action: 'verification',
          },
        });
      }

      logger.info(`Additional documents requested for verification ${verificationId}`);
    } catch (error) {
      logger.error('Error requesting additional documents:', error);
      throw error;
    }
  }

  /**
   * Notify admins of new verification
   */
  private async notifyAdmins(sponsorId: string) {
    try {
      const admins = await prisma.user.findMany({
        where: { accountType: 'ADMIN' },
        select: { id: true },
      });

      for (const admin of admins) {
        await notificationService.create({
          userId: admin.id,
          type: 'SYSTEM',
          title: '📝 New Verification Request',
          body: `A new sponsor verification request requires your attention.`,
          data: {
            screen: 'admin',
            action: 'verifications',
            id: sponsorId,
          },
        });
      }
    } catch (error) {
      logger.error('Error notifying admins:', error);
    }
  }

  /**
   * Get verification statistics
   */
  async getVerificationStats() {
    try {
      const [pending, approved, rejected, total] = await Promise.all([
        prisma.sponsorVerification.count({ where: { status: 'pending' } }),
        prisma.sponsorVerification.count({ where: { status: 'approved' } }),
        prisma.sponsorVerification.count({ where: { status: 'rejected' } }),
        prisma.sponsor.count(),
      ]);

      return {
        pending,
        approved,
        rejected,
        total,
        completionRate: total > 0 ? ((approved + rejected) / total) * 100 : 0,
        approvalRate: (approved + rejected) > 0 ? (approved / (approved + rejected)) * 100 : 0,
      };
    } catch (error) {
      logger.error('Error getting verification stats:', error);
      throw error;
    }
  }
}

export const verificationService = new VerificationService();