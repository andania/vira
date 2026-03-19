/**
 * OAuth Validators
 * Zod validation schemas for OAuth operations
 */

import { z } from 'zod';

// Google login validation
export const googleLoginValidator = z.object({
  body: z.object({
    token: z.string().min(1, 'Google token is required'),
  }),
});

// Facebook login validation
export const facebookLoginValidator = z.object({
  body: z.object({
    accessToken: z.string().min(1, 'Facebook access token is required'),
  }),
});

// Apple login validation
export const appleLoginValidator = z.object({
  body: z.object({
    identityToken: z.string().min(1, 'Apple identity token is required'),
    user: z
      .object({
        name: z
          .object({
            firstName: z.string().optional(),
            lastName: z.string().optional(),
          })
          .optional(),
        email: z.string().email().optional(),
      })
      .optional(),
  }),
});

// Link account validation
export const linkAccountValidator = z.object({
  body: z.object({
    provider: z.enum(['google', 'facebook', 'apple']),
    accessToken: z.string().min(1, 'Access token is required'),
  }),
});

// Unlink account validation
export const unlinkAccountValidator = z.object({
  params: z.object({
    provider: z.enum(['google', 'facebook', 'apple']),
  }),
});

// Get linked accounts validation
export const getLinkedAccountsValidator = z.object({});