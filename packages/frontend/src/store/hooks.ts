/**
 * Redux Hooks
 * Typed hooks for using Redux in components
 */

import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './index';

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Auth hooks
export const useAuth = () => useAppSelector((state) => state.auth);
export const useIsAuthenticated = () => useAppSelector((state) => state.auth.isAuthenticated);
export const useCurrentUser = () => useAppSelector((state) => state.auth.user);
export const useAuthLoading = () => useAppSelector((state) => state.auth.isLoading);

// User hooks
export const useUser = () => useAppSelector((state) => state.user);
export const useUserProfile = () => useAppSelector((state) => state.user.profile);
export const useUserPreferences = () => useAppSelector((state) => state.user.preferences);

// Wallet hooks
export const useWallet = () => useAppSelector((state) => state.wallet);
export const useWalletBalance = () => useAppSelector((state) => state.wallet.balance);
export const useTransactions = () => useAppSelector((state) => state.wallet.transactions);

// Campaign hooks
export const useCampaign = () => useAppSelector((state) => state.campaign);
export const useCampaigns = () => useAppSelector((state) => state.campaign.campaigns);
export const useCurrentCampaign = () => useAppSelector((state) => state.campaign.currentCampaign);

// Room hooks
export const useRoom = () => useAppSelector((state) => state.room);
export const useRooms = () => useAppSelector((state) => state.room.rooms);
export const useCurrentRoom = () => useAppSelector((state) => state.room.currentRoom);
export const useRoomParticipants = () => useAppSelector((state) => state.room.participants);
export const useRoomMessages = () => useAppSelector((state) => state.room.messages);

// Billboard hooks
export const useBillboard = () => useAppSelector((state) => state.billboard);
export const useFeed = () => useAppSelector((state) => state.billboard.feed);
export const useTrending = () => useAppSelector((state) => state.billboard.trending);
export const useRecommendations = () => useAppSelector((state) => state.billboard.recommendations);

// Marketplace hooks
export const useMarketplace = () => useAppSelector((state) => state.marketplace);
export const useProducts = () => useAppSelector((state) => state.marketplace.products);
export const useCurrentProduct = () => useAppSelector((state) => state.marketplace.currentProduct);
export const useCart = () => useAppSelector((state) => state.marketplace.cart);
export const useOrders = () => useAppSelector((state) => state.marketplace.orders);

// Notification hooks
export const useNotification = () => useAppSelector((state) => state.notification);
export const useNotifications = () => useAppSelector((state) => state.notification.notifications);
export const useUnreadCount = () => useAppSelector((state) => state.notification.unreadCount);

// Gamification hooks
export const useGamification = () => useAppSelector((state) => state.gamification);
export const useRank = () => useAppSelector((state) => state.gamification.rank);
export const useAchievements = () => useAppSelector((state) => state.gamification.achievements);
export const useLeaderboard = () => useAppSelector((state) => state.gamification.leaderboard);
export const useChallenges = () => useAppSelector((state) => state.gamification.challenges);

// Analytics hooks
export const useAnalytics = () => useAppSelector((state) => state.analytics);
export const useUserAnalytics = () => useAppSelector((state) => state.analytics.userAnalytics);
export const useCampaignAnalytics = () => useAppSelector((state) => state.analytics.campaignAnalytics);

// Admin hooks
export const useAdmin = () => useAppSelector((state) => state.admin);
export const useAdminUsers = () => useAppSelector((state) => state.admin.users);
export const useAdminSponsors = () => useAppSelector((state) => state.admin.sponsors);
export const useAdminReports = () => useAppSelector((state) => state.admin.reports);

// UI hooks
export const useUI = () => useAppSelector((state) => state.ui);
export const useTheme = () => useAppSelector((state) => state.ui.theme);
export const useSidebar = () => useAppSelector((state) => state.ui.sidebarOpen);
export const useModals = () => useAppSelector((state) => state.ui.modals);
export const useToasts = () => useAppSelector((state) => state.ui.toasts);
export const useIsLoading = () => useAppSelector((state) => state.ui.isLoading);
export const useDimensions = () => useAppSelector((state) => state.ui.dimensions);