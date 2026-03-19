/**
 * Email Library Index
 * Exports email-related services and types
 */

export { emailService, EmailService } from './email.service';
export type { EmailOptions, EmailResult } from './email.service';

// Export all email templates (for reference)
export const emailTemplates = [
  'welcome.html',
  'verification.html',
  'password-reset.html',
  'cap-earned.html',
  'withdrawal.html',
  'deposit.html',
  'campaign-start.html',
  'campaign-end.html',
  'room-invite.html',
  'achievement.html',
  'security-alert.html',
  're-engagement.html',
  'weekly-digest.html',
  'order-confirmation.html',
  'order-shipped.html',
  'order-delivered.html',
  'review-request.html',
] as const;

export type EmailTemplate = typeof emailTemplates[number];