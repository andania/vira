/**
 * Stripe Payment Provider
 */

import Stripe from 'stripe';
import { config } from '../../../config';
import { logger } from '../../../core/logger';

let stripe: Stripe | null = null;

if (config.stripeSecretKey) {
  stripe = new Stripe(config.stripeSecretKey, {
    apiVersion: '2023-10-16',
  });
}

export const stripeProvider = {
  /**
   * Create payment intent
   */
  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata: Record<string, any> = {}
  ): Promise<any> {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata,
        automaticPaymentMethods: {
          enabled: true,
        },
      });

      return {
        id: paymentIntent.id,
        amount,
        currency,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret,
        provider: 'stripe',
      };
    } catch (error) {
      logger.error('Stripe create payment intent error:', error);
      throw error;
    }
  },

  /**
   * Confirm payment intent
   */
  async confirmPaymentIntent(paymentIntentId: string): Promise<any> {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        status: paymentIntent.status,
        provider: 'stripe',
      };
    } catch (error) {
      logger.error('Stripe confirm payment intent error:', error);
      throw error;
    }
  },

  /**
   * Cancel payment intent
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<void> {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      await stripe.paymentIntents.cancel(paymentIntentId);
    } catch (error) {
      logger.error('Stripe cancel payment intent error:', error);
      throw error;
    }
  },

  /**
   * Get payment intent
   */
  async getPaymentIntent(paymentIntentId: string): Promise<any> {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        status: paymentIntent.status,
        provider: 'stripe',
      };
    } catch (error) {
      logger.error('Stripe get payment intent error:', error);
      throw error;
    }
  },

  /**
   * Get payment method
   */
  async getPaymentMethod(paymentMethodId: string): Promise<any> {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

      return {
        id: paymentMethod.id,
        type: paymentMethod.type,
        card: paymentMethod.card ? {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          expMonth: paymentMethod.card.exp_month,
          expYear: paymentMethod.card.exp_year,
        } : undefined,
        billingDetails: paymentMethod.billing_details,
      };
    } catch (error) {
      logger.error('Stripe get payment method error:', error);
      throw error;
    }
  },

  /**
   * Create refund
   */
  async createRefund(transactionId: string, amount: number): Promise<any> {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      const refund = await stripe.refunds.create({
        payment_intent: transactionId,
        amount: Math.round(amount * 100),
      });

      return {
        success: refund.status === 'succeeded',
        refundId: refund.id,
        amount: refund.amount / 100,
      };
    } catch (error) {
      logger.error('Stripe create refund error:', error);
      throw error;
    }
  },

  /**
   * Create customer
   */
  async createCustomer(email: string, name?: string): Promise<string> {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      const customer = await stripe.customers.create({
        email,
        name,
      });

      return customer.id;
    } catch (error) {
      logger.error('Stripe create customer error:', error);
      throw error;
    }
  },

  /**
   * Create setup intent
   */
  async createSetupIntent(customerId?: string): Promise<any> {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
      });

      return {
        id: setupIntent.id,
        clientSecret: setupIntent.client_secret,
        status: setupIntent.status,
      };
    } catch (error) {
      logger.error('Stripe create setup intent error:', error);
      throw error;
    }
  },

  /**
   * Handle webhook
   */
  async handleWebhook(body: any, signature: string): Promise<any> {
    if (!stripe || !config.stripeWebhookSecret) {
      throw new Error('Stripe not configured');
    }

    try {
      const event = stripe.webhooks.constructEvent(
        body,
        signature,
        config.stripeWebhookSecret
      );

      return event;
    } catch (error) {
      logger.error('Stripe webhook error:', error);
      throw error;
    }
  },

  /**
   * Get supported currencies
   */
  getSupportedCurrencies(): string[] {
    return ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'CHF', 'DKK', 'NOK', 'SEK', 'JPY'];
  },
};