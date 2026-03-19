/**
 * Currency and CAP conversion utilities
 */

import { CAP_ECONOMICS } from '../constants/cap-weights';

/**
 * Convert CAP to fiat currency
 */
export const convertCapToFiat = (
  capAmount: number,
  capValue: number = CAP_ECONOMICS.INITIAL_CAP_VALUE,
  feePercentage: number = 0.01 // 1% fee
): {
  fiatAmount: number;
  fee: number;
  netAmount: number;
} => {
  const fiatAmount = capAmount * capValue;
  const fee = fiatAmount * feePercentage;
  const netAmount = fiatAmount - fee;
  
  return {
    fiatAmount,
    fee,
    netAmount,
  };
};

/**
 * Convert fiat to CAP
 */
export const convertFiatToCap = (
  fiatAmount: number,
  capValue: number = CAP_ECONOMICS.INITIAL_CAP_VALUE,
  bonusPercentage: number = 0
): {
  capAmount: number;
  bonus: number;
  totalCap: number;
} => {
  const baseCap = Math.floor(fiatAmount / capValue);
  const bonus = Math.floor(baseCap * bonusPercentage);
  const totalCap = baseCap + bonus;
  
  return {
    capAmount: baseCap,
    bonus,
    totalCap,
  };
};

/**
 * Calculate current CAP value based on economics
 */
export const calculateCapValue = (
  totalCapInCirculation: number,
  totalFiatReserve: number,
  stabilityReserveRatio: number = CAP_ECONOMICS.STABILITY_RESERVE_RATIO
): number => {
  if (totalCapInCirculation === 0) return CAP_ECONOMICS.INITIAL_CAP_VALUE;
  
  const availableReserve = totalFiatReserve * (1 - stabilityReserveRatio);
  return availableReserve / totalCapInCirculation;
};

/**
 * Apply CAP decay based on inactivity
 */
export const applyCapDecay = (
  balance: number,
  inactivityMonths: number,
  decayRates: Record<string, number> = {
    '12': 0.1, // 10% after 12 months
    '24': 0.25, // 25% after 24 months
    '36': 0.5, // 50% after 36 months
  }
): {
  newBalance: number;
  decayAmount: number;
  decayRate: number;
} => {
  let decayRate = 0;
  
  if (inactivityMonths >= 36) {
    decayRate = decayRates['36'];
  } else if (inactivityMonths >= 24) {
    decayRate = decayRates['24'];
  } else if (inactivityMonths >= 12) {
    decayRate = decayRates['12'];
  }
  
  const decayAmount = Math.floor(balance * decayRate);
  const newBalance = balance - decayAmount;
  
  return {
    newBalance,
    decayAmount,
    decayRate,
  };
};

/**
 * Calculate reward with rank multiplier
 */
export const calculateReward = (
  baseReward: number,
  multiplier: number = 1.0
): number => {
  return Math.floor(baseReward * multiplier);
};

/**
 * Calculate daily earnings with limits
 */
export const calculateDailyEarnings = (
  currentEarnings: number,
  newReward: number,
  dailyLimit: number
): {
  allowed: boolean;
  remainingLimit: number;
  actualReward: number;
} => {
  const remainingLimit = dailyLimit - currentEarnings;
  const allowed = remainingLimit >= newReward;
  const actualReward = allowed ? newReward : Math.max(0, remainingLimit);
  
  return {
    allowed,
    remainingLimit: Math.max(0, remainingLimit - actualReward),
    actualReward,
  };
};

/**
 * Format CAP with suffix (K, M, B)
 */
export const formatCapWithSuffix = (cap: number): string => {
  if (cap < 1000) return cap.toString();
  if (cap < 1000000) return (cap / 1000).toFixed(1) + 'K';
  if (cap < 1000000000) return (cap / 1000000).toFixed(1) + 'M';
  return (cap / 1000000000).toFixed(1) + 'B';
};

/**
 * Calculate CAP required for fiat amount
 */
export const capRequiredForFiat = (
  fiatAmount: number,
  capValue: number = CAP_ECONOMICS.INITIAL_CAP_VALUE
): number => {
  return Math.ceil(fiatAmount / capValue);
};

/**
 * Calculate fiat value of CAP
 */
export const fiatValueOfCap = (
  capAmount: number,
  capValue: number = CAP_ECONOMICS.INITIAL_CAP_VALUE
): number => {
  return Number((capAmount * capValue).toFixed(2));
};

/**
 * Validate if user can afford CAP amount
 */
export const canAfford = (balance: number, required: number): boolean => {
  return balance >= required;
};

/**
 * Calculate withdrawal fee
 */
export const calculateWithdrawalFee = (
  amount: number,
  feePercentage: number = 0.02 // 2% default
): number => {
  return amount * feePercentage;
};

/**
 * Calculate net withdrawal amount
 */
export const calculateNetWithdrawal = (
  amount: number,
  feePercentage: number = 0.02
): number => {
  const fee = calculateWithdrawalFee(amount, feePercentage);
  return amount - fee;
};