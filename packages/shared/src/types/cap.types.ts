/**
 * CAP (Convertible Accumulated Points) economy type definitions
 */

import { UUID, DateTime } from './index';

// Transaction types
export enum TransactionType {
  EARN = 'earn',
  SPEND = 'spend',
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
  TRANSFER_IN = 'transfer_in',
  TRANSFER_OUT = 'transfer_out',
  BONUS = 'bonus',
  DECAY = 'decay',
  REFUND = 'refund'
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum WithdrawalStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// Wallet interfaces
export interface CapWallet {
  id: UUID;
  userId: UUID;
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  lastTransactionAt?: DateTime;
  isFrozen: boolean;
  freezeReason?: string;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface CapTransaction {
  id: UUID;
  walletId: UUID;
  transactionType: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceId?: UUID;
  referenceType?: string;
  description?: string;
  metadata?: Record<string, any>;
  status: TransactionStatus;
  createdAt: DateTime;
}

export interface CapEarning {
  id: UUID;
  userId: UUID;
  transactionId?: UUID;
  engagementId?: UUID;
  actionId?: UUID;
  amount: number;
  multiplier: number;
  finalAmount: number;
  sourceType: string;
  sourceId: UUID;
  createdAt: DateTime;
}

export interface CapSpending {
  id: UUID;
  userId: UUID;
  transactionId?: UUID;
  orderId?: UUID;
  productId?: UUID;
  amount: number;
  spendingType: 'purchase' | 'transfer' | 'fee' | 'other';
  createdAt: DateTime;
}

export interface CapWithdrawal {
  id: UUID;
  userId: UUID;
  walletId: UUID;
  capAmount: number;
  fiatAmount: number;
  exchangeRate: number;
  feeAmount: number;
  netAmount: number;
  paymentMethod: string;
  accountDetails: Record<string, any>;
  status: WithdrawalStatus;
  processedBy?: UUID;
  processedAt?: DateTime;
  failureReason?: string;
  createdAt: DateTime;
  completedAt?: DateTime;
}

export interface CapDeposit {
  id: UUID;
  userId: UUID;
  walletId: UUID;
  fiatAmount: number;
  capAmount: number;
  exchangeRate: number;
  feeAmount: number;
  paymentMethod: string;
  paymentProvider: string;
  transactionId: string;
  status: TransactionStatus;
  createdAt: DateTime;
  completedAt?: DateTime;
}

export interface CapTransfer {
  id: UUID;
  senderId: UUID;
  receiverId: UUID;
  amount: number;
  feeAmount: number;
  netAmount: number;
  note?: string;
  status: TransactionStatus;
  senderTransactionId?: UUID;
  receiverTransactionId?: UUID;
  createdAt: DateTime;
  completedAt?: DateTime;
}

export interface CapRate {
  id: UUID;
  rateDate: DateTime;
  capToFiat: number;
  fiatToCap: number;
  totalCapCirculation: number;
  totalFiatReserve: number;
  createdAt: DateTime;
}

export interface CapDecayLog {
  id: UUID;
  userId: UUID;
  walletId: UUID;
  originalBalance: number;
  decayRate: number;
  decayAmount: number;
  newBalance: number;
  decayReason: 'inactivity_12m' | 'inactivity_24m' | 'inactivity_36m' | 'penalty';
  createdAt: DateTime;
}

// DTOs
export interface DepositRequest {
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentProvider: string;
  returnUrl?: string;
}

export interface WithdrawalRequest {
  amount: number;
  currency: string;
  paymentMethod: string;
  accountDetails: Record<string, any>;
}

export interface TransferRequest {
  receiverId: UUID;
  amount: number;
  note?: string;
}

export interface ConvertRequest {
  amount: number;
  fromType: 'cap' | 'fiat';
  toType: 'cap' | 'fiat';
}

// Reward weights for engagement actions
export interface RewardWeights {
  view: number;
  like: number;
  comment: number;
  share: number;
  clickLink: number;
  suggest: number;
  pollVote: number;
  quizComplete: number;
  saveProduct: number;
  followBrand: number;
  reportIssue: number;
  inviteFriend: number;
}

// Default reward weights from PRD
export const DEFAULT_REWARD_WEIGHTS: RewardWeights = {
  view: 30,
  like: 10,
  comment: 20,
  share: 40,
  clickLink: 50,
  suggest: 60,
  pollVote: 25,
  quizComplete: 45,
  saveProduct: 15,
  followBrand: 5,
  reportIssue: 10,
  inviteFriend: 35
};

// CAP limits by user rank
export interface CapLimits {
  dailyEarn: number;
  dailySpend: number;
  monthlyEarn: number;
  monthlySpend: number;
  withdrawal: number;
}

export const RANK_CAP_LIMITS: Record<string, CapLimits> = {
  explorer: {
    dailyEarn: 200,
    dailySpend: 500,
    monthlyEarn: 5000,
    monthlySpend: 10000,
    withdrawal: 50
  },
  engager: {
    dailyEarn: 500,
    dailySpend: 1000,
    monthlyEarn: 12000,
    monthlySpend: 20000,
    withdrawal: 100
  },
  contributor: {
    dailyEarn: 1000,
    dailySpend: 2000,
    monthlyEarn: 25000,
    monthlySpend: 40000,
    withdrawal: 250
  },
  influencer: {
    dailyEarn: 2000,
    dailySpend: 4000,
    monthlyEarn: 50000,
    monthlySpend: 80000,
    withdrawal: 500
  },
  brand_ambassador: {
    dailyEarn: 5000,
    dailySpend: 10000,
    monthlyEarn: 125000,
    monthlySpend: 200000,
    withdrawal: 1000
  },
  viraz_champion: {
    dailyEarn: 10000,
    dailySpend: 20000,
    monthlyEarn: 250000,
    monthlySpend: 400000,
    withdrawal: 2500
  }
};