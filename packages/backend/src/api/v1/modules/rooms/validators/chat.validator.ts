/**
 * Chat Validators
 * Zod validation schemas for chat operations
 */

import { z } from 'zod';

// Send message validation
export const sendMessageValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
  body: z.object({
    content: z.string().min(1, 'Message cannot be empty').max(1000, 'Message too long'),
    mentions: z.array(z.string().uuid()).optional(),
    repliedTo: z.string().uuid().optional(),
  }),
});

// Get messages validation
export const getMessagesValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    before: z.string().optional(),
  }),
});

// Delete message validation
export const deleteMessageValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
    messageId: z.string().uuid('Invalid message ID format'),
  }),
});

// Pin message validation
export const pinMessageValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
    messageId: z.string().uuid('Invalid message ID format'),
  }),
});

// Unpin message validation
export const unpinMessageValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
    messageId: z.string().uuid('Invalid message ID format'),
  }),
});

// Get pinned messages validation
export const getPinnedMessagesValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
});

// Set typing validation
export const setTypingValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
  body: z.object({
    isTyping: z.boolean(),
  }),
});

// Get typing users validation
export const getTypingUsersValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
});

// Search messages validation
export const searchMessagesValidator = z.object({
  params: z.object({
    roomId: z.string().uuid('Invalid room ID format'),
  }),
  query: z.object({
    q: z.string().min(1, 'Search query required'),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});