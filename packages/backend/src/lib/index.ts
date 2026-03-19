/**
 * VIRAZ Platform - Shared Libraries Index
 * Central export point for all library modules
 */

// =====================================================
// Email Module
// =====================================================
export * from './email';
export { emailService, EmailService } from './email/email.service';
export type { EmailOptions, EmailResult, EmailTemplate } from './email/email.service';

// =====================================================
// SMS Module
// =====================================================
export * from './sms';
export { smsService, SmsService } from './sms/sms.service';
export type { SmsData, SmsResult, SmsTemplate, SmsTemplateType } from './sms/sms.service';

// =====================================================
// Push Notifications Module
// =====================================================
export * from './push';
export { pushService, PushService } from './push/push.service';
export { firebaseService, FirebaseService } from './push/firebase.service';
export type { 
  PushNotificationData, 
  PushResult, 
  MulticastResult,
  PushCategory,
  PushPriority,
  FirebaseMessage,
  FirebaseBatchResponse 
} from './push';

// =====================================================
// Payment Module
// =====================================================
export * from './payment';
export { paymentService, PaymentService } from './payment/payment.service';
export { webhookService, WebhookService } from './payment/webhook.service';
export { stripeProvider } from './payment/providers/stripe.provider';
export { paypalProvider } from './payment/providers/paypal.provider';
export { flutterwaveProvider } from './payment/providers/flutterwave.provider';
export { paystackProvider } from './payment/providers/paystack.provider';
export type {
  PaymentIntent,
  PaymentMethod,
  PaymentResult,
  PaymentProvider,
  PaymentProviderType,
} from './payment';

// =====================================================
// Storage Module
// =====================================================
export * from './storage';
export { storageService, StorageService } from './storage/storage.service';
export { s3Service, S3Service } from './storage/s3.service';
export { cloudinaryService, CloudinaryService } from './storage/cloudinary.service';
export type {
  UploadOptions,
  UploadResult,
  FileInfo,
  StorageProvider,
  StorageProviderType,
  FileCategory,
  ImagePreset,
} from './storage';

// =====================================================
// Streaming Module
// =====================================================
export * from './streaming';
export { streamingService, StreamingService } from './streaming/streaming.service';
export { muxService, MuxService } from './streaming/mux.service';
export { webrtcService, WebRTCService } from './streaming/webrtc.service';
export type {
  StreamConfig,
  StreamInfo,
  StreamToken,
  StreamingProvider,
  VideoQuality,
  AudioQuality,
  StreamStatus,
  ParticipantRole,
  SignalingMessage,
  MuxStream,
  MuxRecording,
  PeerConnection,
  RoomParticipant,
} from './streaming';

// =====================================================
// Library Metadata
// =====================================================

/**
 * Library version
 */
export const LIB_VERSION = '1.0.0';

/**
 * Library name
 */
export const LIB_NAME = '@viraz/lib';

/**
 * Available modules
 */
export const LIB_MODULES = [
  'email',
  'sms',
  'push',
  'payment',
  'storage',
  'streaming',
] as const;

export type LibModule = typeof LIB_MODULES[number];

/**
 * Module descriptions
 */
export const LIB_MODULE_DESCRIPTIONS: Record<LibModule, string> = {
  email: 'Email sending and template management',
  sms: 'SMS sending and template management',
  push: 'Push notification services (Firebase)',
  payment: 'Payment processing with multiple providers',
  storage: 'File storage with multiple providers',
  streaming: 'Video streaming with Mux and WebRTC',
};

/**
 * Check if a module is available
 */
export const isModuleAvailable = (module: LibModule): boolean => {
  try {
    switch (module) {
      case 'email':
        return !!process.env.SMTP_HOST;
      case 'sms':
        return !!process.env.TWILIO_ACCOUNT_SID;
      case 'push':
        return !!process.env.FIREBASE_PROJECT_ID;
      case 'payment':
        return !!(process.env.STRIPE_SECRET_KEY || process.env.PAYPAL_CLIENT_ID);
      case 'storage':
        return !!(process.env.AWS_ACCESS_KEY_ID || process.env.CLOUDINARY_CLOUD_NAME);
      case 'streaming':
        return !!(process.env.MUX_TOKEN_ID || process.env.WS_URL);
      default:
        return false;
    }
  } catch {
    return false;
  }
};

/**
 * Get library health status
 */
export const getLibraryHealth = async (): Promise<Record<LibModule, boolean>> => {
  const health: Record<string, boolean> = {};

  for (const module of LIB_MODULES) {
    try {
      health[module] = isModuleAvailable(module);
    } catch {
      health[module] = false;
    }
  }

  return health;
};

/**
 * Library configuration validation
 */
export const validateLibraryConfig = (): string[] => {
  const missing: string[] = [];

  if (!isModuleAvailable('email')) {
    missing.push('Email configuration incomplete (SMTP required)');
  }

  if (!isModuleAvailable('sms')) {
    missing.push('SMS configuration incomplete (Twilio required)');
  }

  if (!isModuleAvailable('push')) {
    missing.push('Push notification configuration incomplete (Firebase required)');
  }

  if (!isModuleAvailable('payment')) {
    missing.push('Payment configuration incomplete (Stripe or PayPal required)');
  }

  if (!isModuleAvailable('storage')) {
    missing.push('Storage configuration incomplete (AWS S3 or Cloudinary required)');
  }

  if (!isModuleAvailable('streaming')) {
    missing.push('Streaming configuration incomplete (Mux or WebRTC required)');
  }

  return missing;
};

// Export all services as a convenient object
export const services = {
  email: emailService,
  sms: smsService,
  push: pushService,
  payment: paymentService,
  storage: storageService,
  streaming: streamingService,
  firebase: firebaseService,
  webhook: webhookService,
  s3: s3Service,
  cloudinary: cloudinaryService,
  mux: muxService,
  webrtc: webrtcService,
};

// Export all providers
export const providers = {
  stripe: stripeProvider,
  paypal: paypalProvider,
  flutterwave: flutterwaveProvider,
  paystack: paystackProvider,
};

// Default export
export default {
  version: LIB_VERSION,
  name: LIB_NAME,
  modules: LIB_MODULES,
  services,
  providers,
  isModuleAvailable,
  getLibraryHealth,
  validateLibraryConfig,
};