/**
 * Wallet API Service
 */

import { ApiClient } from './client';

export interface Wallet {
  id: string;
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  isFrozen: boolean;
}

export interface Transaction {
  id: string;
  type: 'EARN' | 'SPEND' | 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'BONUS' | 'DECAY';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string;
  createdAt: string;
}

export interface Deposit {
  id: string;
  amount: number;
  capAmount: number;
  status: string;
  paymentMethod: string;
  transactionId?: string;
  createdAt: string;
}

export interface Withdrawal {
  id: string;
  amount: number;
  capAmount: number;
  status: string;
  paymentMethod: string;
  estimatedArrival?: string;
  createdAt: string;
}

export interface PaymentMethod {
  id: string;
  type: string;
  last4?: string;
  brand?: string;
  isDefault: boolean;
}

export interface CapValue {
  value: number;
  change24h: number;
  totalSupply: number;
}

export const walletApi = {
  /**
   * Get wallet
   */
  getWallet: () =>
    ApiClient.get<Wallet>('/api/v1/wallet'),

  /**
   * Get wallet balance
   */
  getBalance: () =>
    ApiClient.get<{ balance: number }>('/api/v1/wallet/balance'),

  /**
   * Get transactions
   */
  getTransactions: (page: number = 1, limit: number = 20, type?: string) =>
    ApiClient.get<PaginatedResponse<Transaction>>('/api/v1/wallet/transactions', {
      params: { page, limit, type },
    }),

  /**
   * Get deposits
   */
  getDeposits: (page: number = 1, limit: number = 20) =>
    ApiClient.get<PaginatedResponse<Deposit>>('/api/v1/wallet/deposits', {
      params: { page, limit },
    }),

  /**
   * Get withdrawals
   */
  getWithdrawals: (page: number = 1, limit: number = 20) =>
    ApiClient.get<PaginatedResponse<Withdrawal>>('/api/v1/wallet/withdrawals', {
      params: { page, limit },
    }),

  /**
   * Create deposit intent
   */
  createDepositIntent: (amount: number, paymentMethod: string) =>
    ApiClient.post<{ paymentIntent: any }>('/api/v1/wallet/deposit/intent', {
      amount,
      paymentMethod,
    }),

  /**
   * Confirm deposit (Stripe)
   */
  confirmDeposit: (paymentIntentId: string) =>
    ApiClient.post('/api/v1/wallet/deposit/confirm', { paymentIntentId }),

  /**
   * Execute PayPal payment
   */
  executePayPalPayment: (paymentId: string, payerId: string) =>
    ApiClient.post('/api/v1/wallet/deposit/paypal/execute', { paymentId, payerId }),

  /**
   * Cancel payment
   */
  cancelPayment: (paymentIntentId: string) =>
    ApiClient.post(`/api/v1/wallet/deposit/cancel/${paymentIntentId}`, {}),

  /**
   * Request withdrawal
   */
  requestWithdrawal: (amount: number, paymentMethod: string, accountDetails: any) =>
    ApiClient.post<Withdrawal>('/api/v1/wallet/withdrawal/request', {
      amount,
      paymentMethod,
      accountDetails,
    }),

  /**
   * Cancel withdrawal
   */
  cancelWithdrawal: (withdrawalId: string, reason?: string) =>
    ApiClient.post(`/api/v1/wallet/withdrawal/${withdrawalId}/cancel`, { reason }),

  /**
   * Transfer CAP
   */
  transferCap: (receiverId: string, amount: number, note?: string) =>
    ApiClient.post<{ transfer: any }>('/api/v1/wallet/transfer', {
      receiverId,
      amount,
      note,
    }),

  /**
   * Get payment methods
   */
  getPaymentMethods: () =>
    ApiClient.get<PaymentMethod[]>('/api/v1/wallet/payment-methods'),

  /**
   * Add payment method
   */
  addPaymentMethod: (paymentMethodId: string, provider: string = 'stripe') =>
    ApiClient.post<PaymentMethod>('/api/v1/wallet/payment-methods', {
      paymentMethodId,
      provider,
    }),

  /**
   * Remove payment method
   */
  removePaymentMethod: (methodId: string) =>
    ApiClient.delete(`/api/v1/wallet/payment-methods/${methodId}`),

  /**
   * Set default payment method
   */
  setDefaultPaymentMethod: (methodId: string) =>
    ApiClient.put(`/api/v1/wallet/payment-methods/${methodId}/default`, {}),

  /**
   * Get deposit methods
   */
  getDepositMethods: () =>
    ApiClient.get<any[]>('/api/v1/wallet/deposit/methods'),

  /**
   * Get withdrawal methods
   */
  getWithdrawalMethods: () =>
    ApiClient.get<any[]>('/api/v1/wallet/withdrawal/methods'),

  /**
   * Get CAP value
   */
  getCapValue: () =>
    ApiClient.get<CapValue>('/api/v1/wallet/cap-value'),

  /**
   * Get transaction by ID
   */
  getTransactionById: (transactionId: string) =>
    ApiClient.get<Transaction>(`/api/v1/wallet/transactions/${transactionId}`),

  /**
   * Get withdrawal by ID
   */
  getWithdrawalById: (withdrawalId: string) =>
    ApiClient.get<Withdrawal>(`/api/v1/wallet/withdrawals/${withdrawalId}`),

  /**
   * Get deposit by ID
   */
  getDepositById: (depositId: string) =>
    ApiClient.get<Deposit>(`/api/v1/wallet/deposits/${depositId}`),
};

export default walletApi;