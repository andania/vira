/**
 * Hooks Index
 * Central export point for all custom hooks
 */

export * from './useAuth';
export * from './useWallet';
export * from './useCampaign';
export * from './useRoom';
export * from './useBillboard';
export * from './useMarketplace';
export * from './useNotifications';
export * from './useGamification';
export * from './useAnalytics';
export * from './useSocket';
export * from './useLocalStorage';
export * from './useDebounce';
export * from './useInfiniteScroll';
export * from './useClickOutside';
export * from './useMediaQuery';
export * from './usePagination';
export * from './useForm';

// Re-export commonly used hooks
import { useAuth } from './useAuth';
import { useWallet } from './useWallet';
import { useSocket } from './useSocket';
import { useNotifications } from './useNotifications';

export const commonHooks = {
  useAuth,
  useWallet,
  useSocket,
  useNotifications,
};