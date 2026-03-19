/**
 * Wallet Slice
 * Manages CAP wallet and transactions state
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { walletApi } from '../../services/api/wallet.api';

interface Wallet {
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  isFrozen: boolean;
}

interface Transaction {
  id: string;
  type: 'EARN' | 'SPEND' | 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'BONUS' | 'DECAY';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string;
  createdAt: string;
}

interface Deposit {
  id: string;
  amount: number;
  capAmount: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
}

interface Withdrawal {
  id: string;
  amount: number;
  capAmount: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
}

interface PaymentMethod {
  id: string;
  type: string;
  last4?: string;
  brand?: string;
  isDefault: boolean;
}

interface CapValue {
  value: number;
  change24h: number;
  totalSupply: number;
}

interface WalletState {
  wallet: Wallet | null;
  transactions: Transaction[];
  deposits: Deposit[];
  withdrawals: Withdrawal[];
  paymentMethods: PaymentMethod[];
  capValue: CapValue | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    transactions: { page: number; limit: number; total: number; hasMore: boolean };
    deposits: { page: number; limit: number; total: number; hasMore: boolean };
    withdrawals: { page: number; limit: number; total: number; hasMore: boolean };
  };
}

const initialState: WalletState = {
  wallet: null,
  transactions: [],
  deposits: [],
  withdrawals: [],
  paymentMethods: [],
  capValue: null,
  isLoading: false,
  error: null,
  pagination: {
    transactions: { page: 1, limit: 20, total: 0, hasMore: false },
    deposits: { page: 1, limit: 20, total: 0, hasMore: false },
    withdrawals: { page: 1, limit: 20, total: 0, hasMore: false },
  },
};

// Async thunks
export const fetchWallet = createAsyncThunk('wallet/fetchWallet', async () => {
  const response = await walletApi.getWallet();
  return response.data;
});

export const fetchBalance = createAsyncThunk('wallet/fetchBalance', async () => {
  const response = await walletApi.getBalance();
  return response.data;
});

export const fetchTransactions = createAsyncThunk(
  'wallet/fetchTransactions',
  async ({ page = 1, limit = 20, type }: { page?: number; limit?: number; type?: string }) => {
    const response = await walletApi.getTransactions(page, limit, type);
    return response.data;
  }
);

export const fetchDeposits = createAsyncThunk(
  'wallet/fetchDeposits',
  async ({ page = 1, limit = 20 }: { page?: number; limit?: number }) => {
    const response = await walletApi.getDeposits(page, limit);
    return response.data;
  }
);

export const fetchWithdrawals = createAsyncThunk(
  'wallet/fetchWithdrawals',
  async ({ page = 1, limit = 20 }: { page?: number; limit?: number }) => {
    const response = await walletApi.getWithdrawals(page, limit);
    return response.data;
  }
);

export const fetchPaymentMethods = createAsyncThunk('wallet/fetchPaymentMethods', async () => {
  const response = await walletApi.getPaymentMethods();
  return response.data;
});

export const fetchCapValue = createAsyncThunk('wallet/fetchCapValue', async () => {
  const response = await walletApi.getCapValue();
  return response.data;
});

export const createDepositIntent = createAsyncThunk(
  'wallet/createDepositIntent',
  async ({ amount, paymentMethod }: { amount: number; paymentMethod: string }) => {
    const response = await walletApi.createDepositIntent(amount, paymentMethod);
    return response.data;
  }
);

export const requestWithdrawal = createAsyncThunk(
  'wallet/requestWithdrawal',
  async ({ amount, paymentMethod, accountDetails }: { amount: number; paymentMethod: string; accountDetails: any }) => {
    const response = await walletApi.requestWithdrawal(amount, paymentMethod, accountDetails);
    return response.data;
  }
);

export const transferCap = createAsyncThunk(
  'wallet/transferCap',
  async ({ receiverId, amount, note }: { receiverId: string; amount: number; note?: string }) => {
    const response = await walletApi.transferCap(receiverId, amount, note);
    return response.data;
  }
);

export const addPaymentMethod = createAsyncThunk(
  'wallet/addPaymentMethod',
  async ({ paymentMethodId, provider }: { paymentMethodId: string; provider: string }) => {
    const response = await walletApi.addPaymentMethod(paymentMethodId, provider);
    return response.data;
  }
);

export const removePaymentMethod = createAsyncThunk(
  'wallet/removePaymentMethod',
  async (methodId: string) => {
    await walletApi.removePaymentMethod(methodId);
    return methodId;
  }
);

export const setDefaultPaymentMethod = createAsyncThunk(
  'wallet/setDefaultPaymentMethod',
  async (methodId: string) => {
    await walletApi.setDefaultPaymentMethod(methodId);
    return methodId;
  }
);

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    clearWalletData: (state) => {
      state.wallet = null;
      state.transactions = [];
      state.deposits = [];
      state.withdrawals = [];
      state.paymentMethods = [];
    },
    resetPagination: (state) => {
      state.pagination = initialState.pagination;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch wallet
      .addCase(fetchWallet.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWallet.fulfilled, (state, action) => {
        state.isLoading = false;
        state.wallet = action.payload;
      })
      .addCase(fetchWallet.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch wallet';
      })

      // Fetch balance
      .addCase(fetchBalance.fulfilled, (state, action) => {
        if (state.wallet) {
          state.wallet.balance = action.payload.balance;
        }
      })

      // Fetch transactions
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.transactions = action.payload.transactions;
        state.pagination.transactions = {
          page: action.payload.page,
          limit: action.payload.limit,
          total: action.payload.total,
          hasMore: action.payload.hasMore,
        };
      })

      // Fetch deposits
      .addCase(fetchDeposits.fulfilled, (state, action) => {
        state.deposits = action.payload.deposits;
        state.pagination.deposits = {
          page: action.payload.page,
          limit: action.payload.limit,
          total: action.payload.total,
          hasMore: action.payload.hasMore,
        };
      })

      // Fetch withdrawals
      .addCase(fetchWithdrawals.fulfilled, (state, action) => {
        state.withdrawals = action.payload.withdrawals;
        state.pagination.withdrawals = {
          page: action.payload.page,
          limit: action.payload.limit,
          total: action.payload.total,
          hasMore: action.payload.hasMore,
        };
      })

      // Fetch payment methods
      .addCase(fetchPaymentMethods.fulfilled, (state, action) => {
        state.paymentMethods = action.payload;
      })

      // Fetch CAP value
      .addCase(fetchCapValue.fulfilled, (state, action) => {
        state.capValue = action.payload;
      })

      // Create deposit intent
      .addCase(createDepositIntent.fulfilled, (state, action) => {
        // Handle deposit intent (e.g., redirect to payment page)
      })

      // Request withdrawal
      .addCase(requestWithdrawal.fulfilled, (state, action) => {
        state.withdrawals.unshift(action.payload);
        if (state.wallet) {
          state.wallet.balance -= action.payload.capAmount;
        }
      })

      // Transfer CAP
      .addCase(transferCap.fulfilled, (state, action) => {
        state.transactions.unshift(action.payload.senderTransaction);
        if (state.wallet) {
          state.wallet.balance -= action.payload.amount;
        }
      })

      // Add payment method
      .addCase(addPaymentMethod.fulfilled, (state, action) => {
        state.paymentMethods.push(action.payload);
      })

      // Remove payment method
      .addCase(removePaymentMethod.fulfilled, (state, action) => {
        state.paymentMethods = state.paymentMethods.filter(m => m.id !== action.payload);
      })

      // Set default payment method
      .addCase(setDefaultPaymentMethod.fulfilled, (state, action) => {
        state.paymentMethods = state.paymentMethods.map(m => ({
          ...m,
          isDefault: m.id === action.payload,
        }));
      });
  },
});

export const { clearWalletData, resetPagination } = walletSlice.actions;
export default walletSlice.reducer;