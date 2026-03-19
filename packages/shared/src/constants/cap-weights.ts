/**
 * CAP reward weights for different engagement actions
 * Based on PRD Section 5 - Reward System
 */

import { DEFAULT_REWARD_WEIGHTS } from '../types/cap.types';

// Export the default weights
export { DEFAULT_REWARD_WEIGHTS };

// Individual action weights for easy reference
export const CAP_WEIGHTS = {
  VIEW: 30,
  LIKE: 10,
  COMMENT: 20,
  SHARE: 40,
  CLICK_LINK: 50,
  SUGGEST: 60,
  POLL_VOTE: 25,
  QUIZ_COMPLETE: 45,
  SAVE_PRODUCT: 15,
  FOLLOW_BRAND: 5,
  REPORT_ISSUE: 10,
  INVITE_FRIEND: 35,
  WATCH_LIVE: 70,
  ATTEND_DEMO: 70,
  MAKE_PURCHASE: 100,
} as const;

// Weight multipliers based on user rank
export const RANK_MULTIPLIERS = {
  explorer: 1.0,
  engager: 1.1,
  contributor: 1.2,
  influencer: 1.35,
  brand_ambassador: 1.5,
  viraz_champion: 2.0,
} as const;

// Daily limits per rank
export const DAILY_CAP_LIMITS = {
  explorer: 200,
  engager: 500,
  contributor: 1000,
  influencer: 2000,
  brand_ambassador: 5000,
  viraz_champion: 10000,
} as const;

// Monthly limits per rank
export const MONTHLY_CAP_LIMITS = {
  explorer: 5000,
  engager: 12000,
  contributor: 25000,
  influencer: 50000,
  brand_ambassador: 125000,
  viraz_champion: 250000,
} as const;

// Cooldown periods for actions (in seconds)
export const ACTION_COOLDOWNS = {
  like: 5,
  comment: 30,
  share: 60,
  click_link: 10,
  suggest: 300, // 5 minutes
  poll_vote: 60,
  save_product: 10,
  follow_brand: 60,
  report_issue: 3600, // 1 hour
} as const;

// Maximum actions per day
export const DAILY_ACTION_LIMITS = {
  view: 100,
  like: 200,
  comment: 50,
  share: 30,
  click_link: 20,
  suggest: 10,
  poll_vote: 30,
  quiz_complete: 10,
  save_product: 50,
  follow_brand: 100,
  report_issue: 5,
  invite_friend: 20,
} as const;

// Bonus CAP for streaks
export const STREAK_BONUSES = {
  '7_days': 50,
  '30_days': 200,
  '90_days': 500,
  '365_days': 2000,
} as const;

// Referral rewards
export const REFERRAL_REWARDS = {
  SIGN_UP: 100, // Referrer gets 100 CAP when referral signs up
  FIRST_ENGAGEMENT: 50, // Additional 50 CAP when referral first engages
  FIRST_PURCHASE: 200, // Additional 200 CAP when referral makes first purchase
} as const;

// CAP decay rates (percentage per year)
export const CAP_DECAY_RATES = {
  INACTIVE_12_MONTHS: 10, // 10% decay after 12 months
  INACTIVE_24_MONTHS: 25, // 25% decay after 24 months
  INACTIVE_36_MONTHS: 50, // 50% decay after 36 months
} as const;

// CAP conversion fees
export const CONVERSION_FEES = {
  CAP_TO_FIAT: 0.01, // 1% fee to convert CAP to fiat
  FIAT_TO_CAP: 0, // Free to convert fiat to CAP
  WITHDRAWAL: 0.02, // 2% fee for withdrawals
} as const;

// Minimum and maximum amounts
export const CAP_LIMITS = {
  MIN_DEPOSIT: 100, // Minimum CAP deposit
  MAX_DEPOSIT: 1000000, // Maximum CAP deposit per transaction
  MIN_WITHDRAWAL: 1000, // Minimum CAP withdrawal (converts to ~$10)
  MAX_WITHDRAWAL: 100000, // Maximum CAP withdrawal per transaction
  MAX_TRANSFER: 50000, // Maximum CAP transfer per transaction
} as const;

// CAP economics (dynamic values - these are initial defaults)
export const CAP_ECONOMICS = {
  INITIAL_CAP_VALUE: 0.01, // 1 CAP = $0.01 USD
  STABILITY_RESERVE_RATIO: 0.1, // 10% of deposits held in stability reserve
  MIN_RESERVE_RATIO: 0.05, // Minimum 5% reserve required
} as const;