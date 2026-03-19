/**
 * SMS Configuration
 * Twilio settings and SMS templates
 */

import { config } from './index';

export const smsConfig = {
  // Provider settings
  provider: 'twilio', // twilio, africastalking, vonage

  // Twilio configuration
  twilio: {
    accountSid: config.twilioAccountSid,
    authToken: config.twilioAuthToken,
    phoneNumber: config.twilioPhoneNumber,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
    statusCallback: `${config.apiPrefix}/webhooks/sms/status`,
  },

  // Africa's Talking configuration (for African markets)
  africastalking: {
    apiKey: process.env.AFRICASTALKING_API_KEY,
    username: process.env.AFRICASTALKING_USERNAME,
    senderId: process.env.AFRICASTALKING_SENDER_ID,
  },

  // Vonage (Nexmo) configuration
  vonage: {
    apiKey: process.env.VONAGE_API_KEY,
    apiSecret: process.env.VONAGE_API_SECRET,
    brand: 'VIRAZ',
  },

  // Default sender
  from: config.twilioPhoneNumber || process.env.DEFAULT_SMS_SENDER,

  // SMS templates
  templates: {
    verification: {
      content: 'Your VIRAZ verification code is: {{code}}',
      variables: ['code'],
    },
    loginAlert: {
      content: 'New login to your VIRAZ account from {{location}} on {{device}}',
      variables: ['location', 'device'],
    },
    withdrawal: {
      content: 'Your withdrawal of ${{amount}} has been processed and will arrive in {{time}}',
      variables: ['amount', 'time'],
    },
    capLow: {
      content: 'Your CAP balance is running low ({{balance}}). Earn more by engaging with ads!',
      variables: ['balance'],
    },
    liveStart: {
      content: '🔴 {{roomName}} is live now! Join at {{url}}',
      variables: ['roomName', 'url'],
    },
    deposit: {
      content: 'Your deposit of ${{amount}} has been confirmed. {{capAmount}} CAP added to your wallet.',
      variables: ['amount', 'capAmount'],
    },
    campaignAlert: {
      content: 'Your campaign "{{campaignName}}" has reached {{percent}}% of its goal!',
      variables: ['campaignName', 'percent'],
    },
    securityAlert: {
      content: 'Security alert: {{action}} on your VIRAZ account. If this wasn\'t you, contact support.',
      variables: ['action'],
    },
  },

  // Queue settings
  queue: {
    enabled: true,
    concurrent: 10,
    retryAttempts: 3,
    retryDelay: 30, // 30 seconds
  },

  // Rate limiting
  rateLimit: {
    enabled: true,
    maxPerUser: 10, // Max 10 SMS per user per day
    maxPerNumber: 5, // Max 5 SMS per phone number per hour
    maxPerDay: 1000, // Max 1000 SMS per day globally
  },

  // Delivery settings
  delivery: {
    webhookUrl: `${config.apiPrefix}/webhooks/sms/delivery`,
    trackDeliveries: true,
    fallbackProvider: config.nodeEnv === 'production',
  },

  // Country-specific settings
  countries: {
    GH: { // Ghana
      provider: 'africastalking',
      senderId: 'VIRAZ',
      allowInternational: true,
    },
    NG: { // Nigeria
      provider: 'africastalking',
      senderId: 'VIRAZ',
      allowInternational: true,
    },
    KE: { // Kenya
      provider: 'africastalking',
      senderId: 'VIRAZ',
      allowInternational: true,
    },
    ZA: { // South Africa
      provider: 'vonage',
      senderId: 'VIRAZ',
      allowInternational: true,
    },
    US: { // United States
      provider: 'twilio',
      senderId: null,
      allowInternational: true,
    },
  },

  // Testing
  testMode: config.nodeEnv === 'development',
  logToConsole: config.nodeEnv === 'development',
  testNumbers: process.env.TEST_PHONE_NUMBERS?.split(',') || [],
};

export default smsConfig;