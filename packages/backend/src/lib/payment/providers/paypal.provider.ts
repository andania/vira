/**
 * PayPal Payment Provider
 */

import axios from 'axios';
import { config } from '../../../config';
import { logger } from '../../../core/logger';

let accessToken: string | null = null;
let tokenExpiry: Date | null = null;

const API_BASE = config.paypalMode === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

/**
 * Get PayPal access token
 */
async function getAccessToken(): Promise<string> {
  try {
    // Check if we have a valid token
    if (accessToken && tokenExpiry && tokenExpiry > new Date()) {
      return accessToken;
    }

    const auth = Buffer.from(`${config.paypalClientId}:${config.paypalClientSecret}`).toString('base64');

    const response = await axios.post(
      `${API_BASE}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    accessToken = response.data.access_token;
    tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);

    return accessToken;
  } catch (error) {
    logger.error('PayPal get access token error:', error);
    throw error;
  }
}

export const paypalProvider = {
  /**
   * Create payment intent
   */
  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata: Record<string, any> = {}
  ): Promise<any> {
    try {
      const token = await getAccessToken();

      const response = await axios.post(
        `${API_BASE}/v2/checkout/orders`,
        {
          intent: 'CAPTURE',
          purchase_units: [
            {
              amount: {
                currency_code: currency,
                value: amount.toFixed(2),
              },
              custom_id: JSON.stringify(metadata),
            },
          ],
          application_context: {
            return_url: `${process.env.API_URL}/api/v1/payment/paypal/success`,
            cancel_url: `${process.env.API_URL}/api/v1/payment/paypal/cancel`,
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const approvalUrl = response.data.links.find(
        (link: any) => link.rel === 'approve'
      )?.href;

      return {
        id: response.data.id,
        amount,
        currency,
        status: response.data.status,
        clientSecret: approvalUrl,
        provider: 'paypal',
      };
    } catch (error) {
      logger.error('PayPal create payment intent error:', error);
      throw error;
    }
  },

  /**
   * Confirm payment intent
   */
  async confirmPaymentIntent(paymentIntentId: string): Promise<any> {
    try {
      const token = await getAccessToken();

      const response = await axios.post(
        `${API_BASE}/v2/checkout/orders/${paymentIntentId}/capture`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const capture = response.data.purchase_units[0].payments.captures[0];

      return {
        id: response.data.id,
        amount: parseFloat(capture.amount.value),
        currency: capture.amount.currency_code,
        status: response.data.status === 'COMPLETED' ? 'succeeded' : response.data.status,
        provider: 'paypal',
      };
    } catch (error) {
      logger.error('PayPal confirm payment intent error:', error);
      throw error;
    }
  },

  /**
   * Cancel payment intent
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<void> {
    try {
      const token = await getAccessToken();

      await axios.post(
        `${API_BASE}/v2/checkout/orders/${paymentIntentId}/cancel`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      logger.error('PayPal cancel payment intent error:', error);
      throw error;
    }
  },

  /**
   * Get payment intent
   */
  async getPaymentIntent(paymentIntentId: string): Promise<any> {
    try {
      const token = await getAccessToken();

      const response = await axios.get(
        `${API_BASE}/v2/checkout/orders/${paymentIntentId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      return {
        id: response.data.id,
        amount: parseFloat(response.data.purchase_units[0].amount.value),
        currency: response.data.purchase_units[0].amount.currency_code,
        status: response.data.status,
        provider: 'paypal',
      };
    } catch (error) {
      logger.error('PayPal get payment intent error:', error);
      throw error;
    }
  },

  /**
   * Create refund
   */
  async createRefund(transactionId: string, amount: number): Promise<any> {
    try {
      const token = await getAccessToken();

      const response = await axios.post(
        `${API_BASE}/v2/payments/captures/${transactionId}/refund`,
        {
          amount: {
            value: amount.toFixed(2),
            currency_code: 'USD',
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: response.data.status === 'COMPLETED',
        refundId: response.data.id,
        amount: parseFloat(response.data.amount.value),
      };
    } catch (error) {
      logger.error('PayPal create refund error:', error);
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