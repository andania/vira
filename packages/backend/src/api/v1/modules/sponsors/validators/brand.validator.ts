/**
 * Brand Validators
 * Zod validation schemas for brand operations
 */

import { z } from 'zod';

// Get brand details validation
export const getBrandDetailsValidator = z.object({
  params: z.object({
    brandId: z.string().uuid('Invalid brand ID format'),
  }),
});

// Update brand validation
export const updateBrandValidator = z.object({
  params: z.object({
    brandId: z.string().uuid('Invalid brand ID format'),
  }),
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(500).optional(),
    industry: z.string().optional(),
    logoUrl: z.string().url().optional(),
    coverUrl: z.string().url().optional(),
    website: z.string().url().optional(),
    socialLinks: z.record(z.string()).optional(),
  }),
});

// Delete brand validation
export const deleteBrandValidator = z.object({
  params: z.object({
    brandId: z.string().uuid('Invalid brand ID format'),
  }),
});

// Get brand followers validation
export const getBrandFollowersValidator = z.object({
  params: z.object({
    brandId: z.string().uuid('Invalid brand ID format'),
  }),
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get brand campaigns validation
export const getBrandCampaignsValidator = z.object({
  params: z.object({
    brandId: z.string().uuid('Invalid brand ID format'),
  }),
  query: z.object({
    status: z.string().optional(),
  }),
});

// Get brand rooms validation
export const getBrandRoomsValidator = z.object({
  params: z.object({
    brandId: z.string().uuid('Invalid brand ID format'),
  }),
  query: z.object({
    status: z.string().optional(),
  }),
});

// Get brand analytics validation
export const getBrandAnalyticsValidator = z.object({
  params: z.object({
    brandId: z.string().uuid('Invalid brand ID format'),
  }),
  query: z.object({
    days: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Get team members validation
export const getTeamMembersValidator = z.object({
  params: z.object({
    brandId: z.string().uuid('Invalid brand ID format'),
  }),
});

// Add team member validation
export const addTeamMemberValidator = z.object({
  params: z.object({
    brandId: z.string().uuid('Invalid brand ID format'),
  }),
  body: z.object({
    userId: z.string().uuid('Invalid user ID format'),
    role: z.string(),
  }),
});

// Remove team member validation
export const removeTeamMemberValidator = z.object({
  params: z.object({
    brandId: z.string().uuid('Invalid brand ID format'),
    userId: z.string().uuid('Invalid user ID format'),
  }),
});

// Update team member role validation
export const updateTeamMemberRoleValidator = z.object({
  params: z.object({
    brandId: z.string().uuid('Invalid brand ID format'),
    userId: z.string().uuid('Invalid user ID format'),
  }),
  body: z.object({
    role: z.string(),
  }),
});

// Search brands validation
export const searchBrandsValidator = z.object({
  query: z.object({
    q: z.string().min(1),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Follow brand validation
export const followBrandValidator = z.object({
  params: z.object({
    brandId: z.string().uuid('Invalid brand ID format'),
  }),
});

// Unfollow brand validation
export const unfollowBrandValidator = z.object({
  params: z.object({
    brandId: z.string().uuid('Invalid brand ID format'),
  }),
});