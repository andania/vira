/**
 * Paystack Payment Provider
 */

import axios from 'axios';
import { config } from '../../../config';
import { logger } from '../../../core/logger';
import crypto from 'crypto';

const API_BASE = 'https://api.paystack.co';

export const paystackProvider = {
  /**
   * Create payment intent
   */
  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata: Record<string, any> = {}
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${API_BASE}/transaction/initialize`,
        {
          amount: Math.round(amount * 100), // Convert to kobo/cents
          currency,
          reference: `ref_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
          callback_url: `${process.env.API_URL}/api/v1/payment/paystack/callback`,
          metadata,
        },
        {
          headers: {
            'Authorization': `Bearer ${config.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        id: response.data.data.reference,
        amount,
        currency,
        status: 'pending',
        clientSecret: response.data.data.authorization_url,
        provider: 'paystack',
      };
    } catch (error) {
      logger.error('Paystack create payment intent error:', error);
      throw error;
    }
  },

  /**
   * Verify payment
   */
  async verifyPayment(reference: string): Promise<any> {
    try {
      const response = await axios.get(
        `${API_BASE}/transaction/verify/${reference}`,
        {
          headers: {
            'Authorization': `Bearer ${config.paystackSecretKey}`,
          },
        }
      );

      const data = response.data.data;

      return {
        id: data.reference,
        amount: data.amount / 100,
        currency: data.currency,
        status: data.status === 'success' ? 'succeeded' : data.status,
        provider: 'paystack',
      };
    } catch (error) {
      logger.error('Paystack verify payment error:', error);
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
  async createRefund(transactionId: string, amount?: number): Promise<any> {
    try {
      const response = await axios.post(
        `${API_BASE}/refund`,
        {
          transaction: transactionId,
          amount: amount ? Math.round(amount * 100) : undefined,
        },
        {
          headers: {
            'Authorization': `Bearer ${config.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: response.data.status,
        refundId: response.data.data.id.toString(),
        amount: response.data.data.amount / 100,
      };
    } catch (error) {
      logger.error('Paystack create refund error:', error);
      throw error;
    }
  },

  /**
   * Get banks
   */
  async getBanks(country: string = 'nigeria'): Promise<any[]> {
    try {
      const response = await axios.get(
        `${API_BASE}/bank?country=${country}`,
        {
          headers: {
            'Authorization': `Bearer ${config.paystackSecretKey}`,
          },
        }
      );

      return response.data.data;
    } catch (error) {
      logger.error('Paystack get banks error:', error);
      throw error;
    }
  },

  /**
   * Resolve account number
   */
  async resolveAccountNumber(accountNumber: string, bankCode: string): Promise<any> {
    try {
      const response = await axios.get(
        `${API_BASE}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        {
          headers: {
            'Authorization': `Bearer ${config.paystackSecretKey}`,
          },
        }
      );

      return {
        accountName: response.data.data.account_name,
        accountNumber: response.data.data.account_number,
        bankId: response.data.data.bank_id,
      };
    } catch (error) {
      logger.error('Paystack resolve account number error:', error);
      throw error;
    }
  },

  /**
   * Create transfer recipient
   */
  async createTransferRecipient(
    name: string,
    accountNumber: string,
    bankCode: string,
    currency: string = 'NGN'
  ): Promise<string> {
    try {
      const response = await axios.post(
        `${API_BASE}/transferrecipient`,
        {
          type: 'nuban',
          name,
          account_number: accountNumber,
          bank_code: bankCode,
          currency,
        },
        {
          headers: {
            'Authorization': `Bearer ${config.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.data.recipient_code;
    } catch (error) {
      logger.error('Paystack create transfer recipient error:', error);
      throw error;
    }
  },

  /**
   * Initiate transfer
   */
  async initiateTransfer(
    amount: number,
    recipientCode: string,
    reason?: string
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${API_BASE}/transfer`,
        {
          source: 'balance',
          amount: Math.round(amount * 100),
          recipient: recipientCode,
          reason: reason || 'Withdrawal from VIRAZ',
        },
        {
          headers: {
            'Authorization': `Bearer ${config.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        id: response.data.data.id.toString(),
        amount: response.data.data.amount / 100,
        status: response.data.data.status,
        reference: response.data.data.reference,
      };
    } catch (error) {
      logger.error('Paystack initiate transfer error:', error);
      throw error;
    }
  },

  /**
   * Verify transfer
   */
  async verifyTransfer(transferId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${API_BASE}/transfer/${transferId}`,
        {
          headers: {
            'Authorization': `Bearer ${config.paystackSecretKey}`,
          },
        }
      );

      return {
        id: response.data.data.id.toString(),
        amount: response.data.data.amount / 100,
        status: response.data.data.status,
      };
    } catch (error) {
      logger.error('Paystack verify transfer error:', error);
      throw error;
    }
  },

  /**
   * Get balance
   */
  async getBalance(): Promise<any> {
    try {
      const response = await axios.get(
        `${API_BASE}/balance`,
        {
          headers: {
            'Authorization': `Bearer ${config.paystackSecretKey}`,
          },
        }
      );

      return {
        currency: response.data.data[0].currency,
        balance: response.data.data[0].balance / 100,
      };
    } catch (error) {
      logger.error('Paystack get balance error:', error);
      throw error;
    }
  },

  /**
   * Handle webhook
   */
  async handleWebhook(body: any, signature: string): Promise<any> {
    // Verify webhook signature
    const computedSignature = crypto
      .createHmac('sha512', config.paystackSecretKey || '')
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
    return ['NGN', 'GHS', 'ZAR', 'USD'];
  },
};