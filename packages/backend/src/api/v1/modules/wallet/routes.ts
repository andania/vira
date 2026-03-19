/**
 * Wallet Routes
 * Defines all wallet-related API endpoints
 */

import { Router } from 'express';
import { walletController } from './controllers/wallet.controller';
import { adminWalletController } from './controllers/admin-wallet.controller';
import { webhookController } from './controllers/webhook.controller';
import { transactionController } from './controllers/transaction.controller';
import { depositController } from './controllers/deposit.controller';
import { withdrawalController } from './controllers/withdrawal.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/authorize.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { rateLimit } from '../../middlewares/rate-limit.middleware';
import * as validators from './validators';

const router = Router();

// =====================================================
// Public Webhook Routes (no authentication)
// =====================================================

/**
 * Stripe webhook
 * POST /api/v1/wallet/webhooks/stripe
 */
router.post(
  '/webhooks/stripe',
  validate(validators.stripeWebhookValidator),
  webhookController.handleStripeWebhook
);

/**
 * PayPal webhook
 * POST /api/v1/wallet/webhooks/paypal
 */
router.post(
  '/webhooks/paypal',
  validate(validators.paypalWebhookValidator),
  webhookController.handlePayPalWebhook
);

/**
 * Flutterwave webhook
 * POST /api/v1/wallet/webhooks/flutterwave
 */
router.post(
  '/webhooks/flutterwave',
  validate(validators.flutterwaveWebhookValidator),
  webhookController.handleFlutterwaveWebhook
);

/**
 * Paystack webhook
 * POST /api/v1/wallet/webhooks/paystack
 */
router.post(
  '/webhooks/paystack',
  validate(validators.paystackWebhookValidator),
  webhookController.handlePaystackWebhook
);

/**
 * Mobile Money webhook
 * POST /api/v1/wallet/webhooks/mobile-money
 */
router.post(
  '/webhooks/mobile-money',
  validate(validators.mobileMoneyWebhookValidator),
  webhookController.handleMobileMoneyWebhook
);

// =====================================================
// Protected Routes (require authentication)
// =====================================================

router.use(authenticate);

/**
 * Get CAP value
 * GET /api/v1/wallet/cap-value
 */
router.get(
  '/cap-value',
  validate(validators.getCapValueValidator),
  walletController.getCapValue
);

// =====================================================
// Wallet Routes
// =====================================================

/**
 * Get wallet balance
 * GET /api/v1/wallet/balance
 */
router.get(
  '/balance',
  walletController.getBalance
);

/**
 * Get wallet details
 * GET /api/v1/wallet
 */
router.get(
  '/',
  walletController.getWallet
);

/**
 * Transfer CAP to another user
 * POST /api/v1/wallet/transfer
 */
router.post(
  '/transfer',
  rateLimit({ windowMs: 60 * 60 * 1000, max: 10 }), // 10 transfers per hour
  validate(validators.transferValidator),
  walletController.transferCap
);

// =====================================================
// Deposit Routes
// =====================================================

/**
 * Get deposit methods
 * GET /api/v1/wallet/deposit/methods
 */
router.get(
  '/deposit/methods',
  validate(validators.getDepositMethodsValidator),
  depositController.getDepositMethods
);

/**
 * Create deposit intent
 * POST /api/v1/wallet/deposit/intent
 */
router.post(
  '/deposit/intent',
  rateLimit({ windowMs: 60 * 60 * 1000, max: 20 }), // 20 deposit attempts per hour
  validate(validators.createDepositIntentValidator),
  depositController.createDepositIntent
);

/**
 * Confirm deposit (Stripe)
 * POST /api/v1/wallet/deposit/confirm
 */
router.post(
  '/deposit/confirm',
  validate(validators.confirmDepositValidator),
  depositController.confirmDeposit
);

/**
 * Execute PayPal payment
 * POST /api/v1/wallet/deposit/paypal/execute
 */
router.post(
  '/deposit/paypal/execute',
  validate(validators.executePayPalPaymentValidator),
  depositController.executePayPalPayment
);

/**
 * Cancel payment
 * POST /api/v1/wallet/deposit/cancel/:paymentIntentId
 */
router.post(
  '/deposit/cancel/:paymentIntentId',
  validate(validators.cancelPaymentValidator),
  depositController.cancelPayment
);

/**
 * Get deposit history
 * GET /api/v1/wallet/deposits
 */
router.get(
  '/deposits',
  validate(validators.getDepositHistoryValidator),
  depositController.getDepositHistory
);

/**
 * Get single deposit
 * GET /api/v1/wallet/deposits/:depositId
 */
router.get(
  '/deposits/:depositId',
  validate(validators.getDepositValidator),
  depositController.getDeposit
);

/**
 * Get deposit statistics
 * GET /api/v1/wallet/deposits/stats/summary
 */
router.get(
  '/deposits/stats/summary',
  validate(validators.getDepositStatsValidator),
  depositController.getDepositStatistics
);

// =====================================================
// Withdrawal Routes
// =====================================================

/**
 * Get withdrawal methods
 * GET /api/v1/wallet/withdrawal/methods
 */
router.get(
  '/withdrawal/methods',
  validate(validators.getWithdrawalMethodsValidator),
  withdrawalController.getWithdrawalMethods
);

/**
 * Request withdrawal
 * POST /api/v1/wallet/withdrawal/request
 */
router.post(
  '/withdrawal/request',
  rateLimit({ windowMs: 24 * 60 * 60 * 1000, max: 3 }), // 3 withdrawals per day
  validate(validators.requestWithdrawalValidator),
  withdrawalController.requestWithdrawal
);

/**
 * Cancel withdrawal
 * POST /api/v1/wallet/withdrawal/:withdrawalId/cancel
 */
router.post(
  '/withdrawal/:withdrawalId/cancel',
  validate(validators.cancelWithdrawalValidator),
  withdrawalController.cancelWithdrawal
);

/**
 * Get withdrawal history
 * GET /api/v1/wallet/withdrawals
 */
router.get(
  '/withdrawals',
  validate(validators.getWithdrawalHistoryValidator),
  withdrawalController.getWithdrawalHistory
);

/**
 * Get single withdrawal
 * GET /api/v1/wallet/withdrawals/:withdrawalId
 */
router.get(
  '/withdrawals/:withdrawalId',
  validate(validators.getWithdrawalValidator),
  withdrawalController.getWithdrawal
);

/**
 * Get withdrawal statistics
 * GET /api/v1/wallet/withdrawals/stats/summary
 */
router.get(
  '/withdrawals/stats/summary',
  validate(validators.getWithdrawalStatsValidator),
  withdrawalController.getWithdrawalStatistics
);

// =====================================================
// Transaction Routes
// =====================================================

/**
 * Get transaction history
 * GET /api/v1/wallet/transactions
 */
router.get(
  '/transactions',
  validate(validators.getTransactionsValidator),
  transactionController.getTransactions
);

/**
 * Get single transaction
 * GET /api/v1/wallet/transactions/:transactionId
 */
router.get(
  '/transactions/:transactionId',
  validate(validators.getTransactionValidator),
  transactionController.getTransaction
);

/**
 * Get transaction by reference
 * GET /api/v1/wallet/transactions/reference/:reference
 */
router.get(
  '/transactions/reference/:reference',
  validate(validators.getTransactionByReferenceValidator),
  transactionController.getTransactionByReference
);

/**
 * Get transaction summary
 * GET /api/v1/wallet/transactions/summary/overview
 */
router.get(
  '/transactions/summary/overview',
  validate(validators.getTransactionSummaryValidator),
  transactionController.getTransactionSummary
);

/**
 * Export transactions
 * GET /api/v1/wallet/transactions/export/download
 */
router.get(
  '/transactions/export/download',
  validate(validators.exportTransactionsValidator),
  transactionController.exportTransactions
);

// =====================================================
// Payment Method Routes
// =====================================================

/**
 * Get user payment methods
 * GET /api/v1/wallet/payment-methods
 */
router.get(
  '/payment-methods',
  walletController.getPaymentMethods
);

/**
 * Add payment method
 * POST /api/v1/wallet/payment-methods
 */
router.post(
  '/payment-methods',
  validate(validators.addPaymentMethodValidator),
  walletController.addPaymentMethod
);

/**
 * Remove payment method
 * DELETE /api/v1/wallet/payment-methods/:methodId
 */
router.delete(
  '/payment-methods/:methodId',
  validate(validators.removePaymentMethodValidator),
  walletController.removePaymentMethod
);

/**
 * Set default payment method
 * PUT /api/v1/wallet/payment-methods/:methodId/default
 */
router.put(
  '/payment-methods/:methodId/default',
  validate(validators.setDefaultPaymentMethodValidator),
  walletController.setDefaultPaymentMethod
);

// =====================================================
// Admin Routes (require admin role)
// =====================================================

/**
 * Get wallet statistics
 * GET /api/v1/wallet/admin/stats
 */
router.get(
  '/admin/stats',
  authorize('admin'),
  adminWalletController.getWalletStatistics
);

/**
 * Get economic indicators
 * GET /api/v1/wallet/admin/economics'
 */
router.get(
  '/admin/economics',
  authorize('admin'),
  validate(validators.getEconomicIndicatorsValidator),
  adminWalletController.getEconomicIndicators
);

/**
 * Get fraud statistics
 * GET /api/v1/wallet/admin/fraud'
 */
router.get(
  '/admin/fraud',
  authorize('admin'),
  validate(validators.getFraudStatisticsValidator),
  adminWalletController.getFraudStatistics
);

/**
 * Get pending withdrawals
 * GET /api/v1/wallet/admin/withdrawals/pending'
 */
router.get(
  '/admin/withdrawals/pending',
  authorize('admin'),
  validate(validators.getPendingWithdrawalsValidator),
  adminWalletController.getPendingWithdrawals
);

/**
 * Approve withdrawal
 * POST /api/v1/wallet/admin/withdrawals/:withdrawalId/approve
 */
router.post(
  '/admin/withdrawals/:withdrawalId/approve',
  authorize('admin'),
  validate(validators.approveWithdrawalValidator),
  adminWalletController.approveWithdrawal
);

/**
 * Reject withdrawal
 * POST /api/v1/wallet/admin/withdrawals/:withdrawalId/reject
 */
router.post(
  '/admin/withdrawals/:withdrawalId/reject',
  authorize('admin'),
  validate(validators.rejectWithdrawalValidator),
  adminWalletController.rejectWithdrawal
);

/**
 * Complete withdrawal
 * POST /api/v1/wallet/admin/withdrawals/:withdrawalId/complete
 */
router.post(
  '/admin/withdrawals/:withdrawalId/complete',
  authorize('admin'),
  validate(validators.completeWithdrawalValidator),
  adminWalletController.completeWithdrawal
);

/**
 * Freeze user wallet
 * POST /api/v1/wallet/admin/freeze/:userId
 */
router.post(
  '/admin/freeze/:userId',
  authorize('admin'),
  validate(validators.freezeWalletValidator),
  adminWalletController.freezeWallet
);

/**
 * Unfreeze user wallet
 * POST /api/v1/wallet/admin/unfreeze/:userId
 */
router.post(
  '/admin/unfreeze/:userId',
  authorize('admin'),
  validate(validators.unfreezeWalletValidator),
  adminWalletController.unfreezeWallet
);

/**
 * Get user wallet (admin view)
 * GET /api/v1/wallet/admin/users/:userId
 */
router.get(
  '/admin/users/:userId',
  authorize('admin'),
  validate(validators.getUserWalletValidator),
  adminWalletController.getUserWallet
);

/**
 * Adjust CAP economics
 * POST /api/v1/wallet/admin/economics/adjust
 */
router.post(
  '/admin/economics/adjust',
  authorize('admin'),
  validate(validators.adjustCapEconomicsValidator),
  adminWalletController.adjustCapEconomics
);

export { router as walletRouter };