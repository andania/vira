/**
 * Payment Library Index
 * Exports payment-related services, providers, and types
 */

// Main payment service
export { paymentService, PaymentService } from './payment.service';
export type { PaymentIntent, PaymentMethod, PaymentResult } from './payment.service';

// Webhook service
export { webhookService, WebhookService } from './webhook.service';

// Payment providers
export { stripeProvider } from './providers/stripe.provider';
export { paypalProvider } from './providers/paypal.provider';
export { flutterwaveProvider } from './providers/flutterwave.provider';
export { paystackProvider } from './providers/paystack.provider';

// Provider types
export interface PaymentProvider {
  createPaymentIntent(amount: number, currency: string, metadata?: Record<string, any>): Promise<any>;
  confirmPaymentIntent(paymentIntentId: string): Promise<any>;
  cancelPaymentIntent(paymentIntentId: string): Promise<void>;
  getPaymentIntent(paymentIntentId: string): Promise<any>;
  createRefund(transactionId: string, amount?: number): Promise<any>;
  getSupportedCurrencies(): string[];
}

// Available providers list
export const availableProviders = {
  STRIPE: 'stripe',
  PAYPAL: 'paypal',
  FLUTTERWAVE: 'flutterwave',
  PAYSTACK: 'paystack',
} as const;

export type PaymentProviderType = typeof availableProviders[keyof typeof availableProviders];

// Currency support by region
export const currencySupport = {
  STRIPE: ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'CHF', 'DKK', 'NOK', 'SEK', 'JPY'],
  PAYPAL: ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'CHF', 'DKK', 'NOK', 'SEK', 'JPY'],
  FLUTTERWAVE: ['NGN', 'GHS', 'KES', 'ZAR', 'UGX', 'TZS', 'RWF', 'XOF', 'XAF'],
  PAYSTACK: ['NGN', 'GHS', 'ZAR', 'USD'],
} as const;