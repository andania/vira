/**
 * Payment Service
 * Main payment orchestration service
 */

import { prisma } from '../../../core/database/client';
import { redis } from '../../../core/cache/redis.client';
import { logger } from '../../../core/logger';
import { config } from '../../../config';
import { stripeProvider } from './providers/stripe.provider';
import { paypalProvider } from './providers/paypal.provider';
import { flutterwaveProvider } from './providers/flutterwave.provider';
import { paystackProvider } from './providers/paystack.provider';
import { notificationService } from '../../../api/v1/modules/notifications/services/notification.service';

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret?: string;
  provider: string;
  metadata?: Record<string, any>;
}

export interface PaymentMethod {
  id: string;
  type: string;
  provider: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  billingDetails?: any;
  isDefault?: boolean;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  paymentIntent?: PaymentIntent;
  error?: string;
  provider?: string;
}

export class PaymentService {
  private providers: Map<string, any> = new Map();

  constructor() {
    this.initializeProviders();
  }

  /**
   * Initialize payment providers
   */
  private initializeProviders() {
    // Stripe
    if (config.stripeSecretKey) {
      this.providers.set('stripe', stripeProvider);
      logger.info('✅ Stripe provider initialized');
    }

    // PayPal
    if (config.paypalClientId && config.paypalClientSecret) {
      this.providers.set('paypal', paypalProvider);
      logger.info('✅ PayPal provider initialized');
    }

    // Flutterwave
    if (config.flutterwaveSecretKey) {
      this.providers.set('flutterwave', flutterwaveProvider);
      logger.info('✅ Flutterwave provider initialized');
    }

    // Paystack
    if (config.paystackSecretKey) {
      this.providers.set('paystack', paystackProvider);
      logger.info('✅ Paystack provider initialized');
    }
  }

  /**
   * Create payment intent
   */
  async createPaymentIntent(
    userId: string,
    amount: number,
    currency: string = 'USD',
    provider: string = 'stripe',
    metadata: Record<string, any> = {}
  ): Promise<PaymentIntent> {
    try {
      const providerInstance = this.providers.get(provider);
      
      if (!providerInstance) {
        throw new Error(`Payment provider ${provider} not configured`);
      }

      // Add user info to metadata
      const enrichedMetadata = {
        ...metadata,
        userId,
        timestamp: Date.now(),
      };

      const paymentIntent = await providerInstance.createPaymentIntent(
        amount,
        currency,
        enrichedMetadata
      );

      // Store payment intent in Redis for tracking
      await redis.setex(
        `payment:intent:${paymentIntent.id}`,
        3600, // 1 hour
        JSON.stringify({
          userId,
          amount,
          currency,
          provider,
          status: paymentIntent.status,
          metadata: enrichedMetadata,
        })
      );

      logger.info(`Payment intent created: ${paymentIntent.id} for user ${userId}`);
      return paymentIntent;
    } catch (error) {
      logger.error('Error creating payment intent:', error);
      throw error;
    }
  }

  /**
   * Confirm payment intent
   */
  async confirmPaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    try {
      // Get payment intent info from Redis
      const cached = await redis.get(`payment:intent:${paymentIntentId}`);
      if (!cached) {
        throw new Error('Payment intent not found or expired');
      }

      const { provider } = JSON.parse(cached);
      const providerInstance = this.providers.get(provider);

      if (!providerInstance) {
        throw new Error(`Payment provider ${provider} not configured`);
      }

      const paymentIntent = await providerInstance.confirmPaymentIntent(paymentIntentId);

      // Update cache
      const cachedData = JSON.parse(cached);
      cachedData.status = paymentIntent.status;
      await redis.setex(
        `payment:intent:${paymentIntentId}`,
        3600,
        JSON.stringify(cachedData)
      );

      // If payment succeeded, process deposit
      if (paymentIntent.status === 'succeeded') {
        await this.processSuccessfulPayment(paymentIntentId);
      }

      return paymentIntent;
    } catch (error) {
      logger.error('Error confirming payment intent:', error);
      throw error;
    }
  }

  /**
   * Process successful payment
   */
  private async processSuccessfulPayment(paymentIntentId: string): Promise<void> {
    try {
      const cached = await redis.get(`payment:intent:${paymentIntentId}`);
      if (!cached) return;

      const data = JSON.parse(cached);
      
      // Record transaction in database
      await prisma.paymentTransaction.create({
        data: {
          userId: data.userId,
          amount: data.amount,
          currency: data.currency,
          provider: data.provider,
          providerTransactionId: paymentIntentId,
          status: 'completed',
          metadata: data.metadata,
        },
      });

      // Send notification
      await notificationService.create({
        userId: data.userId,
        type: 'FINANCIAL',
        title: '✅ Payment Successful',
        body: `Your payment of ${data.amount} ${data.currency} was successful.`,
        data: {
          screen: 'wallet',
          action: 'view_transactions',
        },
      });

      // Clear cache
      await redis.del(`payment:intent:${paymentIntentId}`);

      logger.info(`Payment ${paymentIntentId} processed successfully for user ${data.userId}`);
    } catch (error) {
      logger.error('Error processing successful payment:', error);
    }
  }

  /**
   * Cancel payment intent
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<void> {
    try {
      const cached = await redis.get(`payment:intent:${paymentIntentId}`);
      if (!cached) return;

      const { provider, userId } = JSON.parse(cached);
      const providerInstance = this.providers.get(provider);

      if (providerInstance) {
        await providerInstance.cancelPaymentIntent(paymentIntentId);
      }

      await redis.del(`payment:intent:${paymentIntentId}`);

      // Send notification
      await notificationService.create({
        userId,
        type: 'FINANCIAL',
        title: '❌ Payment Cancelled',
        body: 'Your payment has been cancelled.',
        data: {
          screen: 'wallet',
          action: 'deposit',
        },
      });

      logger.info(`Payment intent ${paymentIntentId} cancelled`);
    } catch (error) {
      logger.error('Error cancelling payment intent:', error);
      throw error;
    }
  }

  /**
   * Get payment intent
   */
  async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntent | null> {
    try {
      const cached = await redis.get(`payment:intent:${paymentIntentId}`);
      if (!cached) return null;

      const { provider } = JSON.parse(cached);
      const providerInstance = this.providers.get(provider);

      if (!providerInstance) return null;

      return providerInstance.getPaymentIntent(paymentIntentId);
    } catch (error) {
      logger.error('Error getting payment intent:', error);
      return null;
    }
  }

  /**
   * Save payment method
   */
  async savePaymentMethod(userId: string, paymentMethodId: string, provider: string = 'stripe'): Promise<PaymentMethod> {
    try {
      const providerInstance = this.providers.get(provider);
      
      if (!providerInstance) {
        throw new Error(`Payment provider ${provider} not configured`);
      }

      const paymentMethod = await providerInstance.getPaymentMethod(paymentMethodId);

      // Save to database
      const saved = await prisma.paymentMethod.create({
        data: {
          userId,
          methodType: paymentMethod.type,
          provider,
          accountLast4: paymentMethod.card?.last4,
          cardBrand: paymentMethod.card?.brand,
          cardExpiryMonth: paymentMethod.card?.expMonth,
          cardExpiryYear: paymentMethod.card?.expYear,
          billingDetails: paymentMethod.billingDetails,
          isActive: true,
        },
      });

      logger.info(`Payment method saved for user ${userId}`);
      return saved;
    } catch (error) {
      logger.error('Error saving payment method:', error);
      throw error;
    }
  }

  /**
   * Get user payment methods
   */
  async getUserPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    try {
      const methods = await prisma.paymentMethod.findMany({
        where: { userId, isActive: true },
        orderBy: { isDefault: 'desc' },
      });

      return methods;
    } catch (error) {
      logger.error('Error getting user payment methods:', error);
      throw error;
    }
  }

  /**
   * Delete payment method
   */
  async deletePaymentMethod(methodId: string, userId: string): Promise<void> {
    try {
      await prisma.paymentMethod.update({
        where: { id: methodId, userId },
        data: { isActive: false },
      });

      logger.info(`Payment method ${methodId} deleted for user ${userId}`);
    } catch (error) {
      logger.error('Error deleting payment method:', error);
      throw error;
    }
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(methodId: string, userId: string): Promise<void> {
    try {
      await prisma.$transaction([
        prisma.paymentMethod.updateMany({
          where: { userId },
          data: { isDefault: false },
        }),
        prisma.paymentMethod.update({
          where: { id: methodId, userId },
          data: { isDefault: true },
        }),
      ]);

      logger.info(`Default payment method set to ${methodId} for user ${userId}`);
    } catch (error) {
      logger.error('Error setting default payment method:', error);
      throw error;
    }
  }

  /**
   * Process refund
   */
  async processRefund(transactionId: string, amount?: number): Promise<PaymentResult> {
    try {
      const transaction = await prisma.paymentTransaction.findUnique({
        where: { providerTransactionId: transactionId },
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      const providerInstance = this.providers.get(transaction.provider);
      
      if (!providerInstance) {
        throw new Error(`Payment provider ${transaction.provider} not configured`);
      }

      const refundAmount = amount || transaction.amount;
      const refund = await providerInstance.createRefund(transactionId, refundAmount);

      if (refund.success) {
        // Record refund
        await prisma.paymentRefund.create({
          data: {
            originalTransactionId: transaction.id,
            amount: refundAmount,
            reason: 'customer_request',
            status: 'completed',
            processedAt: new Date(),
          },
        });

        // Send notification
        await notificationService.create({
          userId: transaction.userId,
          type: 'FINANCIAL',
          title: '💰 Refund Processed',
          body: `A refund of ${refundAmount} ${transaction.currency} has been processed.`,
          data: {
            screen: 'wallet',
            action: 'view_transactions',
          },
        });
      }

      return refund;
    } catch (error) {
      logger.error('Error processing refund:', error);
      throw error;
    }
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if provider is available
   */
  isProviderAvailable(provider: string): boolean {
    return this.providers.has(provider);
  }

  /**
   * Get supported currencies for provider
   */
  getSupportedCurrencies(provider: string): string[] {
    const providerInstance = this.providers.get(provider);
    return providerInstance?.getSupportedCurrencies?.() || [];
  }
}

export const paymentService = new PaymentService();