/**
 * Push Notification Library Index
 * Exports push notification-related services and types
 */

export { pushService, PushService } from './push.service';
export { firebaseService, FirebaseService } from './firebase.service';
export type { 
  PushNotificationData, 
  PushResult, 
  MulticastResult,
  FirebaseMessage,
  FirebaseBatchResponse 
} from './push.service';

// Export push notification categories
export const pushCategories = {
  FINANCIAL: 'financial',
  SOCIAL: 'social',
  PROMOTIONAL: 'promotional',
  SYSTEM: 'system',
  ENGAGEMENT: 'engagement',
} as const;

export type PushCategory = typeof pushCategories[keyof typeof pushCategories];

// Export default priorities
export const pushPriorities = {
  HIGH: 'high',
  NORMAL: 'normal',
  LOW: 'low',
} as const;

export type PushPriority = typeof pushPriorities[keyof typeof pushPriorities];