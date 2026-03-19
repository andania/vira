/**
 * Payment Service
 * Handles payment gateway integrations and processing
 */

import Stripe from 'stripe';
import paypal from 'paypal-rest-sdk';
import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { config } from '../../../../../config';
import { walletService } from './wallet.service';
import { ApiErrorCode } from '@viraz/shared';

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret?: string;
}

export interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  billingDetails?: any;
}

export class PaymentService {
  private stripe: Stripe | null = null;
  private paypalConfigured: boolean = false;

  constructor() {
    // Initialize Stripe if configured
    if (config.stripeSecretKey) {
      this.stripe = new Stripe(config.stripeSecretKey, {
        apiVersion: '2023-10-16',
      });
    }

    // Initialize PayPal if configured
    if (config.paypalClientId && config.paypalClientSecret) {
      paypal.configure({
        mode: config.paypalMode || 'sandbox',
        client_id: config.paypalClientId,
        client_secret: config.paypalClientSecret,
      });
      this.paypalConfigured = true;
    }
  }

  /**
   * Create payment intent for deposit
   */
  async createPaymentIntent(
    userId: string,
    amount: number,
    currency: string = 'USD',
    paymentMethod: string = 'stripe'
  ): Promise<PaymentIntent> {
    try {
      if (paymentMethod === 'stripe' && this.stripe) {
        return await this.createStripePaymentIntent(userId, amount, currency);
      } else if (paymentMethod === 'paypal' && this.paypalConfigured) {
        return await this.createPayPalPaymentIntent(userId, amount, currency);
      } else {
        throw new Error(`Payment method ${paymentMethod} not configured`);
      }
    } catch (error) {
      logger.error('Error creating payment intent:', error);
      throw error;
    }
  }

  /**
   * Create Stripe payment intent
   */
  private async createStripePaymentIntent(
    userId: string,
    amount: number,
    currency: string
  ): Promise<PaymentIntent> {
    try {
      const paymentIntent = await this.stripe!.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata: {
          userId,
          type: 'deposit',
        },
        automaticPaymentMethods: {
          enabled: true,
        },
      });

      // Store payment intent in Redis for tracking
      await redis.setex(
        `payment:intent:${paymentIntent.id}`,
        3600, // 1 hour
        JSON.stringify({
          userId,
          amount,
          currency,
          status: paymentIntent.status,
        })
      );

      return {
        id: paymentIntent.id,
        amount,
        currency,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret || undefined,
      };
    } catch (error) {
      logger.error('Error creating Stripe payment intent:', error);
      throw error;
    }
  }

  /**
   * Create PayPal payment intent
   */
  private async createPayPalPaymentIntent(
    userId: string,
    amount: number,
    currency: string
  ): Promise<PaymentIntent> {
    return new Promise((resolve, reject) => {
      const createPayment = {
        intent: 'sale',
        payer: {
          payment_method: 'paypal',
        },
        transactions: [{
          amount: {
            total: amount.toFixed(2),
            currency: currency,
          },
          description: `VIRAZ wallet deposit for user ${userId}`,
        }],
        redirect_urls: {
          return_url: `${process.env.FRONTEND_URL}/wallet/deposit/success`,
          cancel_url: `${process.env.FRONTEND_URL}/wallet/deposit/cancel`,
        },
      };

      paypal.payment.create(createPayment, async (error, payment) => {
        if (error) {
          logger.error('Error creating PayPal payment:', error);
          reject(error);
          return;
        }

        if (payment) {
          // Store payment in Redis for tracking
          await redis.setex(
            `payment:paypal:${payment.id}`,
            3600,
            JSON.stringify({
              userId,
              amount,
              currency,
              status: payment.state,
            })
          );

          const approvalUrl = payment.links?.find(
            link => link.rel === 'approval_url'
          )?.href;

          resolve({
            id: payment.id,
            amount,
            currency,
            status: payment.state || 'created',
            clientSecret: approvalUrl,
          });
        }
      });
    });
  }

  /**
   * Confirm payment intent (for Stripe)
   */
  async confirmPaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    try {
      if (!this.stripe) {
        throw new Error('Stripe not configured');
      }

      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      // Check Redis for metadata
      const cached = await redis.get(`payment:intent:${paymentIntentId}`);
      if (cached) {
        const data = JSON.parse(cached);
        
        // If payment succeeded, process deposit
        if (paymentIntent.status === 'succeeded') {
          await walletService.deposit({
            userId: data.userId,
            amount: data.amount,
            currency: data.currency,
            paymentMethod: 'stripe',
            paymentProvider: 'stripe',
            transactionId: paymentIntentId,
          });

          // Clear cache
          await redis.del(`payment:intent:${paymentIntentId}`);
        }
      }

      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        status: paymentIntent.status,
      };
    } catch (error) {
      logger.error('Error confirming payment intent:', error);
      throw error;
    }
  }

  /**
   * Execute PayPal payment
   */
  async executePayPalPayment(paymentId: string, payerId: string): Promise<PaymentIntent> {
    return new Promise(async (resolve, reject) => {
      const executePayment = {
        payer_id: payerId,
      };

      paypal.payment.execute(paymentId, executePayment, async (error, payment) => {
        if (error) {
          logger.error('Error executing PayPal payment:', error);
          reject(error);
          return;
        }

        if (payment && payment.state === 'approved') {
          // Get cached data
          const cached = await redis.get(`payment:paypal:${paymentId}`);
          if (cached) {
            const data = JSON.parse(cached);

            // Process deposit
            await walletService.deposit({
              userId: data.userId,
              amount: data.amount,
              currency: data.currency,
              paymentMethod: 'paypal',
              paymentProvider: 'paypal',
              transactionId: paymentId,
            });

            // Clear cache
            await redis.del(`payment:paypal:${paymentId}`);
          }

          const transaction = payment.transactions?.[0];
          const amount = parseFloat(transaction?.amount?.total || '0');

          resolve({
            id: payment.id,
            amount,
            currency: transaction?.amount?.currency || 'USD',
            status: 'succeeded',
          });
        } else {
          reject(new Error('Payment not approved'));
        }
      });
    });
  }

  /**
   * Cancel payment intent
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<void> {
    try {
      await redis.del(`payment:intent:${paymentIntentId}`);
      await redis.del(`payment:paypal:${paymentIntentId}`);
      
      logger.info(`Payment intent ${paymentIntentId} cancelled`);
    } catch (error) {
      logger.error('Error cancelling payment intent:', error);
      throw error;
    }
  }

  /**
   * Handle Stripe webhook
   */
  async handleStripeWebhook(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;
        case 'charge.refunded':
          await this.handleChargeRefunded(event.data.object as Stripe.Charge);
          break;
        default:
          logger.debug(`Unhandled Stripe event type: ${event.type}`);
      }
    } catch (error) {
      logger.error('Error handling Stripe webhook:', error);
      throw error;
    }
  }

  /**
   * Handle successful payment intent
   */
  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    const { userId } = paymentIntent.metadata;
    const amount = paymentIntent.amount / 100;
    const currency = paymentIntent.currency.toUpperCase();

    if (userId) {
      await walletService.deposit({
        userId,
        amount,
        currency,
        paymentMethod: 'stripe',
        paymentProvider: 'stripe',
        transactionId: paymentIntent.id,
      });

      logger.info(`Payment intent succeeded for user ${userId}: ${amount} ${currency}`);
    }
  }

  /**
   * Handle failed payment intent
   */
  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    const { userId } = paymentIntent.metadata;
    
    logger.warn(`Payment intent failed for user ${userId}: ${paymentIntent.last_payment_error?.message}`);

    if (userId) {
      // Notify user of failure
      await notificationService.create({
        userId,
        type: 'FINANCIAL',
        title: '❌ Payment Failed',
        body: `Your payment of ${paymentIntent.amount / 100} ${paymentIntent.currency.toUpperCase()} failed. Please try again.`,
        data: {
          screen: 'wallet',
          action: 'deposit',
        },
      });
    }
  }

  /**
   * Handle refund
   */
  private async handleChargeRefunded(charge: Stripe.Charge) {
    const paymentIntentId = typeof charge.payment_intent === 'string' 
      ? charge.payment_intent 
      : charge.payment_intent?.id;

    if (paymentIntentId) {
      // Get original payment intent
      const paymentIntent = await this.stripe!.paymentIntents.retrieve(paymentIntentId);
      const { userId } = paymentIntent.metadata;
      const amount = charge.amount_refunded / 100;

      if (userId) {
        // Create refund record
        await prisma.paymentRefund.create({
          data: {
            originalTransactionId: paymentIntentId,
            amount,
            reason: charge.refunds?.data[0]?.reason || 'unknown',
            status: 'completed',
            processedAt: new Date(),
          },
        });

        // Notify user
        await notificationService.create({
          userId,
          type: 'FINANCIAL',
          title: '💰 Refund Processed',
          body: `A refund of $${amount} has been processed to your original payment method.`,
          data: {
            screen: 'wallet',
            action: 'view_transactions',
          },
        });

        logger.info(`Refund processed for user ${userId}: $${amount}`);
      }
    }
  }

  /**
   * Get saved payment methods for user
   */
  async getUserPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    try {
      const methods = await prisma.paymentMethod.findMany({
        where: { userId, isActive: true },
        orderBy: { isDefault: 'desc' },
      });

      return methods.map(method => ({
        id: method.id,
        type: method.methodType,
        card: method.cardBrand ? {
          brand: method.cardBrand,
          last4: method.accountLast4 || '',
          expMonth: method.cardExpiryMonth || 0,
          expYear: method.cardExpiryYear || 0,
        } : undefined,
        billingDetails: method.billingDetails,
      }));
    } catch (error) {
      logger.error('Error getting user payment methods:', error);
      throw error;
    }
  }

  /**
   * Add payment method for user
   */
  async addPaymentMethod(
    userId: string,
    paymentMethodId: string,
    provider: string = 'stripe'
  ): Promise<PaymentMethod> {
    try {
      if (provider === 'stripe' && this.stripe) {
        const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);

        // Store in database
        const saved = await prisma.paymentMethod.create({
          data: {
            userId,
            methodType: paymentMethod.type === 'card' ? 'card' : 'other',
            provider,
            accountLast4: paymentMethod.card?.last4,
            cardBrand: paymentMethod.card?.brand,
            cardExpiryMonth: paymentMethod.card?.exp_month,
            cardExpiryYear: paymentMethod.card?.exp_year,
            billingDetails: paymentMethod.billing_details,
            isActive: true,
          },
        });

        return {
          id: saved.id,
          type: saved.methodType,
          card: saved.cardBrand ? {
            brand: saved.cardBrand,
            last4: saved.accountLast4 || '',
            expMonth: saved.cardExpiryMonth || 0,
            expYear: saved.cardExpiryYear || 0,
          } : undefined,
        };
      }

      throw new Error(`Provider ${provider} not supported for adding payment methods`);
    } catch (error) {
      logger.error('Error adding payment method:', error);
      throw error;
    }
  }

  /**
   * Remove payment method
   */
  async removePaymentMethod(userId: string, methodId: string): Promise<void> {
    try {
      await prisma.paymentMethod.update({
        where: { id: methodId, userId },
        data: { isActive: false },
      });

      logger.info(`Payment method ${methodId} removed for user ${userId}`);
    } catch (error) {
      logger.error('Error removing payment method:', error);
      throw error;
    }
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(userId: string, methodId: string): Promise<void> {
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
}

export const paymentService = new PaymentService();