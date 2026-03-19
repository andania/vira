
/**
 * SMS Library Index
 * Exports SMS-related services and types
 */

export { smsService, SmsService } from './sms.service';
export type { SmsData, SmsResult, SmsTemplate } from './sms.service';

// Export SMS templates
export const smsTemplates = [
  'verification',
  'login-alert',
  'withdrawal',
  'deposit',
  'cap-low',
  'live-start',
  'campaign-alert',
  'security-alert',
  'order-confirmed',
  'order-shipped',
  'order-delivered',
  'room-reminder',
  'friend-invite',
  'cap-earned',
  'achievement',
] as const;

export type SmsTemplateType = typeof smsTemplates[number];

// SMS status codes
export const smsStatus = {
  QUEUED: 'queued',
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  UNDELIVERED: 'undelivered',
  FAILED: 'failed',
} as const;

export type SmsStatus = typeof smsStatus[keyof typeof smsStatus];

// SMS providers
export const smsProviders = {
  TWILIO: 'twilio',
  AFRICASTALKING: 'africastalking',
  VONAGE: 'vonage',
} as const;

export type SmsProvider = typeof smsProviders[keyof typeof smsProviders];

// Default sender names by region
export const defaultSenders = {
  US: '+1234567890',
  GH: 'VIRAZ',
  NG: 'VIRAZ',
  KE: 'VIRAZ',
  ZA: 'VIRAZ',
} as const;

export type CountryCode = keyof typeof defaultSenders;