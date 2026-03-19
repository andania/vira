/**
 * Verification Validators
 * Zod validation schemas for sponsor verification
 */

import { z } from 'zod';

// Business details schema
const businessDetailsSchema = z.object({
  legalName: z.string().min(2).max(200),
  registrationNumber: z.string().min(1).max(50),
  taxId: z.string().optional(),
  businessAddress: z.string().min(1).max(500),
  businessPhone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  businessEmail: z.string().email(),
  website: z.string().url().optional(),
  yearEstablished: z.number().min(1900).max(new Date().getFullYear()).optional(),
  numberOfEmployees: z.number().min(1).optional(),
  businessType: z.string(),
  businessCategory: z.string(),
});

// Director details schema
const directorDetailsSchema = z.object({
  fullName: z.string().min(2).max(200),
  dateOfBirth: z.string().or(z.date()).transform(val => new Date(val)),
  nationality: z.string(),
  idNumber: z.string(),
  address: z.string(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  email: z.string().email(),
  position: z.string(),
});

// Submit verification validation
export const submitVerificationValidator = z.object({
  body: z.object({
    businessDetails: businessDetailsSchema,
    directorDetails: z.array(directorDetailsSchema).optional(),
  }),
});

// Get verification status validation
export const getVerificationStatusValidator = z.object({});

// Process verification validation (admin)
export const processVerificationValidator = z.object({
  params: z.object({
    verificationId: z.string().uuid('Invalid verification ID format'),
  }),
  body: z.object({
    approved: z.boolean(),
    notes: z.string().max(1000).optional(),
  }),
});

// Get pending verifications validation (admin)
export const getPendingVerificationsValidator = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get verification details validation (admin)
export const getVerificationDetailsValidator = z.object({
  params: z.object({
    verificationId: z.string().uuid('Invalid verification ID format'),
  }),
});

// Request additional documents validation (admin)
export const requestAdditionalDocumentsValidator = z.object({
  params: z.object({
    verificationId: z.string().uuid('Invalid verification ID format'),
  }),
  body: z.object({
    requestedDocs: z.array(z.string()),
    message: z.string().min(1).max(1000),
  }),
});

// Get verification stats validation (admin)
export const getVerificationStatsValidator = z.object({});

// Upload additional documents validation
export const uploadAdditionalDocumentsValidator = z.object({});