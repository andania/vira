/**
 * Payment Configuration
 * Stripe, PayPal, and other payment gateways
 */

import { config } from './index';

export const paymentConfig = {
  // Default currency
  defaultCurrency: 'USD',
  supportedCurrencies: ['USD', 'EUR', 'GBP', 'GHS', 'NGN', 'KES', 'ZAR', 'XOF'],

  // Payment providers
  providers: {
    stripe: {
      enabled: !!config.stripeSecretKey,
      secretKey: config.stripeSecretKey,
      webhookSecret: config.stripeWebhookSecret,
      apiVersion: '2023-10-16',
      supportedMethods: ['card', 'bank_transfer', 'mobile_money'],
      fees: {
        card: 0.029, // 2.9%
        bank_transfer: 0.01, // 1%
        mobile_money: 0.015, // 1.5%
      },
    },

    paypal: {
      enabled: !!(config.paypalClientId && config.paypalClientSecret),
      clientId: config.paypalClientId,
      clientSecret: config.paypalClientSecret,
      mode: config.paypalMode || 'sandbox',
      webhookId: process.env.PAYPAL_WEBHOOK_ID,
      supportedMethods: ['paypal', 'card', 'venmo'],
      fees: {
        paypal: 0.0349, // 3.49%
        card: 0.029, // 2.9%
      },
    },

    flutterwave: {
      enabled: !!config.flutterwaveSecretKey,
      secretKey: config.flutterwaveSecretKey,
      publicKey: process.env.FLUTTERWAVE_PUBLIC_KEY,
      encryptionKey: process.env.FLUTTERWAVE_ENCRYPTION_KEY,
      supportedMethods: ['card', 'bank_transfer', 'mobile_money', 'ussd'],
      fees: {
        card: 0.014, // 1.4%
        bank_transfer: 0.01, // 1%
        mobile_money: 0.01, // 1%
      },
    },

    paystack: {
      enabled: !!config.paystackSecretKey,
      secretKey: config.paystackSecretKey,
      publicKey: process.env.PAYSTACK_PUBLIC_KEY,
      supportedMethods: ['card', 'bank_transfer', 'mobile_money', 'ussd'],
      fees: {
        card: 0.015, // 1.5%
        bank_transfer: 0.01, // 1%
        mobile_money: 0.01, // 1%
      },
    },
  },

  // CAP conversion
  capConversion: {
    rate: 100, // 1 USD = 100 CAP
    minDeposit: 5, // Minimum $5 deposit
    maxDeposit: 10000, // Maximum $10,000 deposit
    minWithdrawal: 10, // Minimum $10 withdrawal
    maxWithdrawal: 5000, // Maximum $5,000 withdrawal
    fees: {
      deposit: 0, // Free deposits
      withdrawal: 0.02, // 2% withdrawal fee
      conversion: 0.01, // 1% conversion fee
    },
  },

  // Payout settings
  payouts: {
    methods: ['bank', 'mobile_money', 'paypal'],
    schedule: 'daily', // daily, weekly, monthly
    minimumAmount: 10,
    maximumAmount: 5000,
    processingTime: '1-3 business days',
    currencies: ['USD', 'EUR', 'GBP', 'GHS', 'NGN', 'KES'],
  },

  // Webhook settings
  webhooks: {
    stripe: {
      path: '/api/webhooks/stripe',
      events: [
        'payment_intent.succeeded',
        'payment_intent.payment_failed',
        'charge.refunded',
        'charge.dispute.created',
      ],
    },
    paypal: {
      path: '/api/webhooks/paypal',
      events: [
        'PAYMENT.CAPTURE.COMPLETED',
        'PAYMENT.CAPTURE.DENIED',
        'PAYMENT.CAPTURE.REFUNDED',
      ],
    },
    flutterwave: {
      path: '/api/webhooks/flutterwave',
      events: [
        'charge.completed',
        'charge.failed',
        'transfer.success',
      ],
    },
    paystack: {
      path: '/api/webhooks/paystack',
      events: [
        'charge.success',
        'transfer.success',
        'transfer.failed',
      ],
    },
  },

  // Security
  security: {
    encryptCredentials: true,
    validateIps: config.nodeEnv === 'production',
    allowedIps: process.env.ALLOWED_PAYMENT_IPS?.split(',') || [],
    webhookSecrets: {
      stripe: config.stripeWebhookSecret,
      paypal: process.env.PAYPAL_WEBHOOK_SECRET,
      flutterwave: process.env.FLUTTERWAVE_WEBHOOK_SECRET,
      paystack: process.env.PAYSTACK_WEBHOOK_SECRET,
    },
  },
};

export default paymentConfig;