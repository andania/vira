/**
 * useWallet Hook
 * Provides wallet state and methods
 */

import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import {
  fetchWallet,
  fetchBalance,
  fetchTransactions,
  fetchDeposits,
  fetchWithdrawals,
  fetchPaymentMethods,
  fetchCapValue,
  createDepositIntent,
  requestWithdrawal,
  transferCap,
  addPaymentMethod,
  removePaymentMethod,
  setDefaultPaymentMethod,
} from '../store/slices/wallet.slice';
import { useAuth } from './useAuth';

interface DepositParams {
  amount: number;
  paymentMethod: string;
}

interface WithdrawalParams {
  amount: number;
  paymentMethod: string;
  accountDetails: any;
}

interface TransferParams {
  receiverId: string;
  amount: number;
  note?: string;
}

export const useWallet = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useAuth();
  const {
    wallet,
    transactions,
    deposits,
    withdrawals,
    paymentMethods,
    capValue,
    isLoading,
    error,
    pagination,
  } = useSelector((state: RootState) => state.wallet);

  // Load wallet data on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadWallet();
    }
  }, [isAuthenticated]);

  // Load all wallet data
  const loadWallet = useCallback(async () => {
    await Promise.all([
      dispatch(fetchWallet() as any),
      dispatch(fetchBalance() as any),
      dispatch(fetchCapValue() as any),
      dispatch(fetchPaymentMethods() as any),
    ]);
  }, [dispatch]);

  // Load transactions
  const loadTransactions = useCallback(
    async (page: number = 1, type?: string) => {
      return dispatch(fetchTransactions({ page, limit: 20, type }) as any);
    },
    [dispatch]
  );

  // Load more transactions
  const loadMoreTransactions = useCallback(async () => {
    if (pagination.transactions.hasMore) {
      return dispatch(
        fetchTransactions({
          page: pagination.transactions.page + 1,
          limit: 20,
        }) as any
      );
    }
  }, [dispatch, pagination.transactions]);

  // Load deposits
  const loadDeposits = useCallback(
    async (page: number = 1) => {
      return dispatch(fetchDeposits({ page, limit: 20 }) as any);
    },
    [dispatch]
  );

  // Load withdrawals
  const loadWithdrawals = useCallback(
    async (page: number = 1) => {
      return dispatch(fetchWithdrawals({ page, limit: 20 }) as any);
    },
    [dispatch]
  );

  // Create deposit
  const deposit = useCallback(
    async ({ amount, paymentMethod }: DepositParams) => {
      return dispatch(createDepositIntent({ amount, paymentMethod }) as any);
    },
    [dispatch]
  );

  // Request withdrawal
  const withdraw = useCallback(
    async ({ amount, paymentMethod, accountDetails }: WithdrawalParams) => {
      return dispatch(
        requestWithdrawal({ amount, paymentMethod, accountDetails }) as any
      );
    },
    [dispatch]
  );

  // Transfer CAP
  const transfer = useCallback(
    async ({ receiverId, amount, note }: TransferParams) => {
      return dispatch(transferCap({ receiverId, amount, note }) as any);
    },
    [dispatch]
  );

  // Add payment method
  const addPaymentMethod = useCallback(
    async (paymentMethodId: string, provider: string = 'stripe') => {
      return dispatch(addPaymentMethod({ paymentMethodId, provider }) as any);
    },
    [dispatch]
  );

  // Remove payment method
  const removePaymentMethod = useCallback(
    async (methodId: string) => {
      return dispatch(removePaymentMethod(methodId) as any);
    },
    [dispatch]
  );

  // Set default payment method
  const setDefaultPaymentMethod = useCallback(
    async (methodId: string) => {
      return dispatch(setDefaultPaymentMethod(methodId) as any);
    },
    [dispatch]
  );

  // Format CAP amount
  const formatCap = useCallback((amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(amount);
  }, []);

  // Format fiat amount
  const formatFiat = useCallback(
    (amount: number, currency: string = 'USD'): string => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(amount);
    },
    []
  );

  // Get transaction by ID
  const getTransaction = useCallback(
    (transactionId: string) => {
      return transactions.find((t) => t.id === transactionId);
    },
    [transactions]
  );

  // Get balance in fiat
  const getFiatBalance = useCallback((): number => {
    if (!wallet || !capValue) return 0;
    return wallet.balance * capValue.value;
  }, [wallet, capValue]);

  // Check if can afford
  const canAfford = useCallback(
    (amount: number): boolean => {
      if (!wallet) return false;
      return wallet.balance >= amount;
    },
    [wallet]
  );

  return {
    // State
    wallet,
    balance: wallet?.balance || 0,
    transactions,
    deposits,
    withdrawals,
    paymentMethods,
    capValue,
    isLoading,
    error,
    pagination,

    // Methods
    loadWallet,
    loadTransactions,
    loadMoreTransactions,
    loadDeposits,
    loadWithdrawals,
    deposit,
    withdraw,
    transfer,
    addPaymentMethod,
    removePaymentMethod,
    setDefaultPaymentMethod,

    // Utilities
    formatCap,
    formatFiat,
    getTransaction,
    getFiatBalance,
    canAfford,

    // Derived
    hasPaymentMethods: paymentMethods.length > 0,
    defaultPaymentMethod: paymentMethods.find((m) => m.isDefault),
  };
};

export default useWallet;