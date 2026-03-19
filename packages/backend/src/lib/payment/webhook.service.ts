/**
 * Payment Webhook Service
 * Handles payment provider webhooks
 */

import { Request, Response } from 'express';
import { prisma } from '../../core/database/client';
import { logger } from '../../core/logger';
import { paymentService } from './payment.service';
import { stripeProvider } from './providers/stripe.provider';
import { paypalProvider } from './providers/paypal.provider';
import { flutterwaveProvider } from './providers/flutterwave.provider';
import { paystackProvider } from './providers/paystack.provider';
import { walletService } from '../../api/v1/modules/wallet/services/wallet.service';

export class WebhookService {
  /**
   * Handle Stripe webhook
   */
  async handleStripeWebhook(req: Request, res: Response): Promise<void> {
    const sig = req.headers['stripe-signature'] as string;

    try {
      const event = await stripeProvider.handleWebhook(req.body, sig);

      logger.info(`Stripe webhook received: ${event.type}`);

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object);
          break;
        case 'charge.refunded':
          await this.handleChargeRefunded(event.data.object);
          break;
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;
        default:
          logger.debug(`Unhandled Stripe event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      logger.error('Stripe webhook error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Handle PayPal webhook
   */
  async handlePayPalWebhook(req: Request, res: Response): Promise<void> {
    try {
      const event = req.body;

      logger.info(`PayPal webhook received: ${event.event_type}`);

      switch (event.event_type) {
        case 'PAYMENT.CAPTURE.COMPLETED':
          await this.handlePayPalPaymentCompleted(event.resource);
          break;
        case 'PAYMENT.CAPTURE.DENIED':
          await this.handlePayPalPaymentDenied(event.resource);
          break;
        case 'PAYMENT.CAPTURE.REFUNDED':
          await this.handlePayPalPaymentRefunded(event.resource);
          break;
        default:
          logger.debug(`Unhandled PayPal event type: ${event.event_type}`);
      }

      res.json({ received: true });
    } catch (error) {
      logger.error('PayPal webhook error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Handle Flutterwave webhook
   */
  async handleFlutterwaveWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['verif-hash'] as string;
      const event = await flutterwaveProvider.handleWebhook(req.body, signature);

      logger.info(`Flutterwave webhook received: ${event.event}`);

      switch (event.event) {
        case 'charge.completed':
          await this.handleFlutterwaveChargeCompleted(event.data);
          break;
        case 'charge.failed':
          await this.handleFlutterwaveChargeFailed(event.data);
          break;
        case 'transfer.success':
          await this.handleFlutterwaveTransferSuccess(event.data);
          break;
        default:
          logger.debug(`Unhandled Flutterwave event type: ${event.event}`);
      }

      res.json({ received: true });
    } catch (error) {
      logger.error('Flutterwave webhook error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Handle Paystack webhook
   */
  async handlePaystackWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['x-paystack-signature'] as string;
      const event = await paystackProvider.handleWebhook(req.body, signature);

      logger.info(`Paystack webhook received: ${event.event}`);

      switch (event.event) {
        case 'charge.success':
          await this.handlePaystackChargeSuccess(event.data);
          break;
        case 'transfer.success':
          await this.handlePaystackTransferSuccess(event.data);
          break;
        case 'transfer.failed':
          await this.handlePaystackTransferFailed(event.data);
          break;
        default:
          logger.debug(`Unhandled Paystack event type: ${event.event}`);
      }

      res.json({ received: true });
    } catch (error) {
      logger.error('Paystack webhook error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Handle successful payment intent (Stripe)
   */
  private async handlePaymentIntentSucceeded(paymentIntent: any) {
    const { metadata } = paymentIntent;
    const userId = metadata?.userId;
    const amount = paymentIntent.amount / 100;
    const currency = paymentIntent.currency.toUpperCase();

    if (userId) {
      // Process deposit
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
   * Handle failed payment intent (Stripe)
   */
  private async handlePaymentIntentFailed(paymentIntent: any) {
    const { metadata } = paymentIntent;
    const userId = metadata?.userId;

    if (userId) {
      // Notify user of failure
      await prisma.notification.create({
        data: {
          userId,
          type: 'FINANCIAL',
          title: '❌ Payment Failed',
          body: `Your payment of ${paymentIntent.amount / 100} ${paymentIntent.currency.toUpperCase()} failed. Please try again.`,
          data: {
            screen: 'wallet',
            action: 'deposit',
          },
        },
      });

      logger.warn(`Payment intent failed for user ${userId}`);
    }
  }

  /**
   * Handle refund (Stripe)
   */
  private async handleChargeRefunded(charge: any) {
    const paymentIntentId = charge.payment_intent;

    // Get original payment intent from database
    const transaction = await prisma.paymentTransaction.findFirst({
      where: { providerTransactionId: paymentIntentId },
    });

    if (transaction) {
      // Create refund record
      await prisma.paymentRefund.create({
        data: {
          originalTransactionId: transaction.id,
          amount: charge.amount_refunded / 100,
          reason: charge.refunds?.data[0]?.reason || 'unknown',
          status: 'completed',
          processedAt: new Date(),
        },
      });

      // Notify user
      await prisma.notification.create({
        data: {
          userId: transaction.userId,
          type: 'FINANCIAL',
          title: '💰 Refund Processed',
          body: `A refund of $${charge.amount_refunded / 100} has been processed.`,
          data: {
            screen: 'wallet',
            action: 'view_transactions',
          },
        },
      });

      logger.info(`Refund processed for user ${transaction.userId}`);
    }
  }

  /**
   * Handle PayPal payment completed
   */
  private async handlePayPalPaymentCompleted(resource: any) {
    const { id, amount, custom_id } = resource;

    if (custom_id) {
      const metadata = JSON.parse(custom_id);
      const userId = metadata.userId;

      if (userId) {
        await walletService.deposit({
          userId,
          amount: parseFloat(amount.value),
          currency: amount.currency_code,
          paymentMethod: 'paypal',
          paymentProvider: 'paypal',
          transactionId: id,
        });

        logger.info(`PayPal payment completed for user ${userId}`);
      }
    }
  }

  /**
   * Handle PayPal payment denied
   */
  private async handlePayPalPaymentDenied(resource: any) {
    const { custom_id } = resource;

    if (custom_id) {
      const metadata = JSON.parse(custom_id);
      const userId = metadata.userId;

      if (userId) {
        await prisma.notification.create({
          data: {
            userId,
            type: 'FINANCIAL',
            title: '❌ Payment Failed',
            body: 'Your PayPal payment was denied. Please try again.',
            data: {
              screen: 'wallet',
              action: 'deposit',
            },
          },
        });

        logger.warn(`PayPal payment denied for user ${userId}`);
      }
    }
  }

  /**
   * Handle PayPal payment refunded
   */
  private async handlePayPalPaymentRefunded(resource: any) {
    const { custom_id, amount } = resource;

    if (custom_id) {
      const metadata = JSON.parse(custom_id);
      const userId = metadata.userId;

      if (userId) {
        await prisma.notification.create({
          data: {
            userId,
            type: 'FINANCIAL',
            title: '💰 Payment Refunded',
            body: `Your payment of ${amount.value} ${amount.currency_code} has been refunded.`,
            data: {
              screen: 'wallet',
              action: 'view_transactions',
            },
          },
        });

        logger.info(`PayPal payment refunded for user ${userId}`);
      }
    }
  }

  /**
   * Handle Flutterwave charge completed
   */
  private async handleFlutterwaveChargeCompleted(data: any) {
    const { tx_ref, amount, currency, id } = data;

    // Extract userId from tx_ref (format: userId-timestamp)
    const userId = tx_ref.split('-')[0];

    if (userId) {
      await walletService.deposit({
        userId,
        amount: parseFloat(amount),
        currency,
        paymentMethod: 'flutterwave',
        paymentProvider: 'flutterwave',
        transactionId: id.toString(),
      });

      logger.info(`Flutterwave charge completed for user ${userId}`);
    }
  }

  /**
   * Handle Flutterwave charge failed
   */
  private async handleFlutterwaveChargeFailed(data: any) {
    const { tx_ref } = data;
    const userId = tx_ref.split('-')[0];

    if (userId) {
      await prisma.notification.create({
        data: {
          userId,
          type: 'FINANCIAL',
          title: '❌ Payment Failed',
          body: 'Your Flutterwave payment failed. Please try again.',
          data: {
            screen: 'wallet',
            action: 'deposit',
          },
        },
      });

      logger.warn(`Flutterwave charge failed for user ${userId}`);
    }
  }

  /**
   * Handle Flutterwave transfer success
   */
  private async handleFlutterwaveTransferSuccess(data: any) {
    const { reference, id } = data;

    // Update withdrawal status
    await prisma.capWithdrawal.updateMany({
      where: { transactionId: reference },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    logger.info(`Flutterwave transfer succeeded: ${id}`);
  }

  /**
   * Handle Paystack charge success
   */
  private async handlePaystackChargeSuccess(data: any) {
    const { reference, amount, currency, id } = data;

    // Extract userId from reference (format: userId-timestamp)
    const userId = reference.split('-')[0];

    if (userId) {
      await walletService.deposit({
        userId,
        amount: amount / 100, // Paystack amounts are in kobo
        currency,
        paymentMethod: 'paystack',
        paymentProvider: 'paystack',
        transactionId: id.toString(),
      });

      logger.info(`Paystack charge succeeded for user ${userId}`);
    }
  }

  /**
   * Handle Paystack transfer success
   */
  private async handlePaystackTransferSuccess(data: any) {
    const { reference } = data;

    // Update withdrawal status
    await prisma.capWithdrawal.updateMany({
      where: { transactionId: reference },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    logger.info(`Paystack transfer succeeded: ${reference}`);
  }

  /**
   * Handle Paystack transfer failed
   */
  private async handlePaystackTransferFailed(data: any) {
    const { reference, reason } = data;

    // Update withdrawal status
    const withdrawal = await prisma.capWithdrawal.findFirst({
      where: { transactionId: reference },
    });

    if (withdrawal) {
      await prisma.capWithdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: 'FAILED',
          failureReason: reason,
        },
      });

      // Refund the user
      await walletService.deposit({
        userId: withdrawal.userId,
        amount: withdrawal.capAmount / 100,
        currency: 'USD',
        paymentMethod: 'system',
        paymentProvider: 'system',
        transactionId: `refund-${withdrawal.id}`,
      });

      // Notify user
      await prisma.notification.create({
        data: {
          userId: withdrawal.userId,
          type: 'FINANCIAL',
          title: '❌ Withdrawal Failed',
          body: `Your withdrawal failed: ${reason}. Funds have been returned.`,
          data: {
            screen: 'wallet',
            action: 'view_withdrawals',
          },
        },
      });

      logger.warn(`Paystack transfer failed for user ${withdrawal.userId}: ${reason}`);
    }
  }

  /**
   * Handle subscription created
   */
  private async handleSubscriptionCreated(subscription: any) {
    const { metadata } = subscription;
    const userId = metadata?.userId;

    if (userId) {
      // Update user's subscription tier
      await prisma.sponsor.update({
        where: { id: userId },
        data: {
          subscriptionTier: metadata?.tier || 'basic',
          subscriptionExpires: new Date(subscription.current_period_end * 1000),
        },
      });

      logger.info(`Subscription created for user ${userId}`);
    }
  }

  /**
   * Handle subscription updated
   */
  private async handleSubscriptionUpdated(subscription: any) {
    const { metadata } = subscription;
    const userId = metadata?.userId;

    if (userId) {
      // Update subscription expiry
      await prisma.sponsor.update({
        where: { id: userId },
        data: {
          subscriptionExpires: new Date(subscription.current_period_end * 1000),
        },
      });

      logger.info(`Subscription updated for user ${userId}`);
    }
  }

  /**
   * Handle subscription deleted
   */
  private async handleSubscriptionDeleted(subscription: any) {
    const { metadata } = subscription;
    const userId = metadata?.userId;

    if (userId) {
      // Downgrade to basic
      await prisma.sponsor.update({
        where: { id: userId },
        data: {
          subscriptionTier: 'basic',
          subscriptionExpires: null,
        },
      });

      logger.info(`Subscription cancelled for user ${userId}`);
    }
  }
}

export const webhookService = new WebhookService();