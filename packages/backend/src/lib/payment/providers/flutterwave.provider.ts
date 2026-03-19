/**
 * Flutterwave Payment Provider
 */

import axios from 'axios';
import { config } from '../../../config';
import { logger } from '../../../core/logger';
import crypto from 'crypto';

const API_BASE = 'https://api.flutterwave.com/v3';

export const flutterwaveProvider = {
  /**
   * Create payment intent
   */
  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata: Record<string, any> = {}
  ): Promise<any> {
    try {
      const txRef = `tx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      const response = await axios.post(
        `${API_BASE}/payments`,
        {
          tx_ref: txRef,
          amount: amount.toFixed(2),
          currency,
          redirect_url: `${process.env.API_URL}/api/v1/payment/flutterwave/callback`,
          meta: metadata,
          customer: {
            email: metadata.email || 'customer@example.com',
            name: metadata.name,
          },
          customizations: {
            title: 'VIRAZ Payment',
            description: 'Payment for VIRAZ services',
            logo: 'https://viraz.com/logo.png',
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${config.flutterwaveSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        id: response.data.data.id.toString(),
        txRef: response.data.data.tx_ref,
        amount,
        currency,
        status: response.data.data.status,
        clientSecret: response.data.data.link,
        provider: 'flutterwave',
      };
    } catch (error) {
      logger.error('Flutterwave create payment intent error:', error);
      throw error;
    }
  },

  /**
   * Verify payment
   */
  async verifyPayment(transactionId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${API_BASE}/transactions/${transactionId}/verify`,
        {
          headers: {
            'Authorization': `Bearer ${config.flutterwaveSecretKey}`,
          },
        }
      );

      const data = response.data.data;

      return {
        id: data.id.toString(),
        txRef: data.tx_ref,
        amount: parseFloat(data.amount),
        currency: data.currency,
        status: data.status === 'successful' ? 'succeeded' : data.status,
        provider: 'flutterwave',
      };
    } catch (error) {
      logger.error('Flutterwave verify payment error:', error);
      throw error;
    }
  },

  /**
   * Get payment intent
   */
  async getPaymentIntent(paymentIntentId: string): Promise<any> {
    return this.verifyPayment(paymentIntentId);
  },

  /**
   * Create refund
   */
  async createRefund(transactionId: string, amount: number): Promise<any> {
    try {
      const response = await axios.post(
        `${API_BASE}/transactions/${transactionId}/refund`,
        {
          amount: amount.toFixed(2),
        },
        {
          headers: {
            'Authorization': `Bearer ${config.flutterwaveSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: response.data.status === 'success',
        refundId: response.data.data.id.toString(),
        amount: parseFloat(response.data.data.amount),
      };
    } catch (error) {
      logger.error('Flutterwave create refund error:', error);
      throw error;
    }
  },

  /**
   * Get banks
   */
  async getBanks(country: string = 'NG'): Promise<any[]> {
    try {
      const response = await axios.get(
        `${API_BASE}/banks/${country}`,
        {
          headers: {
            'Authorization': `Bearer ${config.flutterwaveSecretKey}`,
          },
        }
      );

      return response.data.data;
    } catch (error) {
      logger.error('Flutterwave get banks error:', error);
      throw error;
    }
  },

  /**
   * Initiate transfer
   */
  async initiateTransfer(
    amount: number,
    bankCode: string,
    accountNumber: string,
    accountName: string,
    narration?: string
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${API_BASE}/transfers`,
        {
          account_bank: bankCode,
          account_number: accountNumber,
          amount: amount.toFixed(2),
          narration: narration || 'Withdrawal from VIRAZ',
          currency: 'NGN',
          reference: `ref_${Date.now()}`,
          beneficiary_name: accountName,
        },
        {
          headers: {
            'Authorization': `Bearer ${config.flutterwaveSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        id: response.data.data.id.toString(),
        amount: parseFloat(response.data.data.amount),
        status: response.data.data.status,
      };
    } catch (error) {
      logger.error('Flutterwave initiate transfer error:', error);
      throw error;
    }
  },

  /**
   * Verify transfer
   */
  async verifyTransfer(transferId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${API_BASE}/transfers/${transferId}`,
        {
          headers: {
            'Authorization': `Bearer ${config.flutterwaveSecretKey}`,
          },
        }
      );

      return {
        id: response.data.data.id.toString(),
        amount: parseFloat(response.data.data.amount),
        status: response.data.data.status,
      };
    } catch (error) {
      logger.error('Flutterwave verify transfer error:', error);
      throw error;
    }
  },

  /**
   * Get balance
   */
  async getBalance(currency: string = 'NGN'): Promise<any> {
    try {
      const response = await axios.get(
        `${API_BASE}/balances/${currency}`,
        {
          headers: {
            'Authorization': `Bearer ${config.flutterwaveSecretKey}`,
          },
        }
      );

      return {
        currency: response.data.data.currency,
        balance: parseFloat(response.data.data.available_balance),
      };
    } catch (error) {
      logger.error('Flutterwave get balance error:', error);
      throw error;
    }
  },

  /**
   * Handle webhook
   */
  async handleWebhook(body: any, signature: string): Promise<any> {
    // Verify webhook signature
    const secretHash = process.env.FLUTTERWAVE_WEBHOOK_SECRET;
    const computedSignature = crypto
      .createHmac('sha256', secretHash || '')
      .update(JSON.stringify(body))
      .digest('hex');

    if (signature !== computedSignature) {
      throw new Error('Invalid webhook signature');
    }

    return body;
  },

  /**
   * Get supported currencies
   */
  getSupportedCurrencies(): string[] {
    return ['NGN', 'GHS', 'KES', 'ZAR', 'UGX', 'TZS', 'RWF', 'XOF', 'XAF'];
  },
};