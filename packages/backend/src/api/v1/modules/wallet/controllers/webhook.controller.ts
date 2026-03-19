/**
 * Webhook Controller
 * Handles payment provider webhooks
 */

import { Request, Response } from 'express';
import { paymentService } from '../services/payment.service';
import { walletService } from '../services/wallet.service';
import { logger } from '../../../../../core/logger';
import { config } from '../../../../../config';
import Stripe from 'stripe';

export class WebhookController {
  /**
   * Handle Stripe webhook
   */
  async handleStripeWebhook(req: Request, res: Response) {
    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;

    try {
      // Verify webhook signature
      const stripe = new Stripe(config.stripeSecretKey!, {
        apiVersion: '2023-10-16',
      });

      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        config.stripeWebhookSecret!
      );

      // Process the event
      await paymentService.handleStripeWebhook(event);

      logger.info(`Stripe webhook processed: ${event.type}`);
      return res.json({ received: true });
    } catch (error) {
      logger.error('Stripe webhook error:', error);
      return res.status(400).json({
        error: `Webhook Error: ${error.message}`,
      });
    }
  }

  /**
   * Handle PayPal webhook
   */
  async handlePayPalWebhook(req: Request, res: Response) {
    try {
      const event = req.body;

      // Verify webhook signature (implement PayPal webhook verification)
      const isValid = await this.verifyPayPalWebhook(req);
      
      if (!isValid) {
        return res.status(400).json({ error: 'Invalid signature' });
      }

      switch (event.event_type) {
        case 'PAYMENT.CAPTURE.COMPLETED':
          await this.handlePayPalPaymentCompleted(event);
          break;
        case 'PAYMENT.CAPTURE.DENIED':
          await this.handlePayPalPaymentDenied(event);
          break;
        case 'PAYMENT.CAPTURE.REFUNDED':
          await this.handlePayPalPaymentRefunded(event);
          break;
        default:
          logger.debug(`Unhandled PayPal event: ${event.event_type}`);
      }

      logger.info(`PayPal webhook processed: ${event.event_type}`);
      return res.json({ received: true });
    } catch (error) {
      logger.error('PayPal webhook error:', error);
      return res.status(400).json({
        error: `Webhook Error: ${error.message}`,
      });
    }
  }

  /**
   * Handle Flutterwave webhook
   */
  async handleFlutterwaveWebhook(req: Request, res: Response) {
    try {
      const event = req.body;
      const signature = req.headers['verif-hash'];

      // Verify webhook signature
      if (signature !== config.flutterwaveWebhookSecret) {
        return res.status(400).json({ error: 'Invalid signature' });
      }

      switch (event.event) {
        case 'charge.completed':
          await this.handleFlutterwaveChargeCompleted(event);
          break;
        case 'charge.failed':
          await this.handleFlutterwaveChargeFailed(event);
          break;
        case 'transfer.success':
          await this.handleFlutterwaveTransferSuccess(event);
          break;
        default:
          logger.debug(`Unhandled Flutterwave event: ${event.event}`);
      }

      logger.info(`Flutterwave webhook processed: ${event.event}`);
      return res.json({ received: true });
    } catch (error) {
      logger.error('Flutterwave webhook error:', error);
      return res.status(400).json({
        error: `Webhook Error: ${error.message}`,
      });
    }
  }

  /**
   * Handle Paystack webhook
   */
  async handlePaystackWebhook(req: Request, res: Response) {
    try {
      const event = req.body;
      const signature = req.headers['x-paystack-signature'];

      // Verify webhook signature
      const isValid = this.verifyPaystackSignature(req.body, signature as string);
      
      if (!isValid) {
        return res.status(400).json({ error: 'Invalid signature' });
      }

      switch (event.event) {
        case 'charge.success':
          await this.handlePaystackChargeSuccess(event);
          break;
        case 'transfer.success':
          await this.handlePaystackTransferSuccess(event);
          break;
        case 'transfer.failed':
          await this.handlePaystackTransferFailed(event);
          break;
        default:
          logger.debug(`Unhandled Paystack event: ${event.event}`);
      }

      logger.info(`Paystack webhook processed: ${event.event}`);
      return res.json({ received: true });
    } catch (error) {
      logger.error('Paystack webhook error:', error);
      return res.status(400).json({
        error: `Webhook Error: ${error.message}`,
      });
    }
  }

  /**
   * Handle mobile money webhook (Africa's Talking, etc.)
   */
  async handleMobileMoneyWebhook(req: Request, res: Response) {
    try {
      const event = req.body;

      switch (event.type) {
        case 'payment.success':
          await this.handleMobileMoneyPaymentSuccess(event);
          break;
        case 'payment.failed':
          await this.handleMobileMoneyPaymentFailed(event);
          break;
        default:
          logger.debug(`Unhandled Mobile Money event: ${event.type}`);
      }

      logger.info(`Mobile Money webhook processed: ${event.type}`);
      return res.json({ received: true });
    } catch (error) {
      logger.error('Mobile Money webhook error:', error);
      return res.status(400).json({
        error: `Webhook Error: ${error.message}`,
      });
    }
  }

  // ==================== PRIVATE HANDLERS ====================

  /**
   * Verify PayPal webhook signature
   */
  private async verifyPayPalWebhook(req: Request): Promise<boolean> {
    // Implement PayPal webhook verification
    // This would use the PayPal SDK to verify the webhook
    return true;
  }

  /**
   * Verify Paystack webhook signature
   */
  private verifyPaystackSignature(payload: any, signature: string): boolean {
    // Implement Paystack webhook verification
    // This would use crypto to verify the signature
    return true;
  }

  /**
   * Handle PayPal payment completed
   */
  private async handlePayPalPaymentCompleted(event: any) {
    const { id, amount, custom_id } = event.resource;
    
    if (custom_id) {
      const [userId, type] = custom_id.split(':');
      
      if (type === 'deposit') {
        await walletService.deposit({
          userId,
          amount: parseFloat(amount.value),
          currency: amount.currency_code,
          paymentMethod: 'paypal',
          paymentProvider: 'paypal',
          transactionId: id,
        });
      }
    }
  }

  /**
   * Handle PayPal payment denied
   */
  private async handlePayPalPaymentDenied(event: any) {
    const { id, custom_id } = event.resource;
    
    if (custom_id) {
      const [userId] = custom_id.split(':');
      
      // Notify user of failed payment
      await notificationService.create({
        userId,
        type: 'FINANCIAL',
        title: '❌ Payment Failed',
        body: 'Your PayPal payment was denied. Please try again.',
        data: {
          screen: 'wallet',
          action: 'deposit',
        },
      });
    }
  }

  /**
   * Handle PayPal payment refunded
   */
  private async handlePayPalPaymentRefunded(event: any) {
    const { id, custom_id, amount } = event.resource;
    
    if (custom_id) {
      const [userId] = custom_id.split(':');
      
      await notificationService.create({
        userId,
        type: 'FINANCIAL',
        title: '💰 Payment Refunded',
        body: `Your payment of ${amount.value} ${amount.currency_code} has been refunded.`,
        data: {
          screen: 'wallet',
          action: 'view_transactions',
        },
      });
    }
  }

  /**
   * Handle Flutterwave charge completed
   */
  private async handleFlutterwaveChargeCompleted(event: any) {
    const { tx_ref, amount, currency, id } = event.data;
    
    const [userId, type] = tx_ref.split('-');
    
    if (type === 'deposit') {
      await walletService.deposit({
        userId,
        amount: parseFloat(amount),
        currency,
        paymentMethod: 'flutterwave',
        paymentProvider: 'flutterwave',
        transactionId: id.toString(),
      });
    }
  }

  /**
   * Handle Flutterwave charge failed
   */
  private async handleFlutterwaveChargeFailed(event: any) {
    const { tx_ref } = event.data;
    const [userId] = tx_ref.split('-');
    
    await notificationService.create({
      userId,
      type: 'FINANCIAL',
      title: '❌ Payment Failed',
      body: 'Your Flutterwave payment failed. Please try again.',
      data: {
        screen: 'wallet',
        action: 'deposit',
      },
    });
  }

  /**
   * Handle Flutterwave transfer success (for withdrawals)
   */
  private async handleFlutterwaveTransferSuccess(event: any) {
    const { reference, id } = event.data;
    
    await prisma.capWithdrawal.updateMany({
      where: { transactionId: reference },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });
  }

  /**
   * Handle Paystack charge success
   */
  private async handlePaystackChargeSuccess(event: any) {
    const { reference, amount, currency, id } = event.data;
    
    const [userId, type] = reference.split('-');
    
    if (type === 'deposit') {
      await walletService.deposit({
        userId,
        amount: amount / 100, // Paystack amounts are in kobo
        currency,
        paymentMethod: 'paystack',
        paymentProvider: 'paystack',
        transactionId: id.toString(),
      });
    }
  }

  /**
   * Handle Paystack transfer success
   */
  private async handlePaystackTransferSuccess(event: any) {
    const { reference } = event.data;
    
    await prisma.capWithdrawal.updateMany({
      where: { transactionId: reference },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });
  }

  /**
   * Handle Paystack transfer failed
   */
  private async handlePaystackTransferFailed(event: any) {
    const { reference, reason } = event.data;
    
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

      await notificationService.create({
        userId: withdrawal.userId,
        type: 'FINANCIAL',
        title: '❌ Withdrawal Failed',
        body: `Your withdrawal failed: ${reason}. Funds have been returned to your wallet.`,
        data: {
          screen: 'wallet',
          action: 'view_withdrawals',
        },
      });
    }
  }

  /**
   * Handle mobile money payment success
   */
  private async handleMobileMoneyPaymentSuccess(event: any) {
    const { externalReference, amount, currency, transactionId } = event.data;
    
    const [userId, type] = externalReference.split('-');
    
    if (type === 'deposit') {
      await walletService.deposit({
        userId,
        amount: parseFloat(amount),
        currency,
        paymentMethod: 'mobile_money',
        paymentProvider: event.provider || 'africastalking',
        transactionId,
      });
    }
  }

  /**
   * Handle mobile money payment failed
   */
  private async handleMobileMoneyPaymentFailed(event: any) {
    const { externalReference, reason } = event.data;
    const [userId] = externalReference.split('-');
    
    await notificationService.create({
      userId,
      type: 'FINANCIAL',
      title: '❌ Mobile Money Payment Failed',
      body: reason || 'Your mobile money payment failed. Please try again.',
      data: {
        screen: 'wallet',
        action: 'deposit',
      },
    });
  }
}

export const webhookController = new WebhookController();