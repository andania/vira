/**
 * Store Slices Index
 * Central export point for all Redux slices
 */

// Import all slices
import authReducer from './auth.slice';
import userReducer from './user.slice';
import walletReducer from './wallet.slice';
import campaignReducer from './campaign.slice';
import roomReducer from './room.slice';
import billboardReducer from './billboard.slice';
import marketplaceReducer from './marketplace.slice';
import notificationReducer from './notification.slice';
import gamificationReducer from './gamification.slice';
import analyticsReducer from './analytics.slice';
import adminReducer from './admin.slice';
import uiReducer from './ui.slice';

// Export all slices as named exports
export {
  authReducer,
  userReducer,
  walletReducer,
  campaignReducer,
  roomReducer,
  billboardReducer,
  marketplaceReducer,
  notificationReducer,
  gamificationReducer,
  analyticsReducer,
  adminReducer,
  uiReducer,
};

// Export all slice actions
export * from './auth.slice';
export * from './user.slice';
export * from './wallet.slice';
export * from './campaign.slice';
export * from './room.slice';
export * from './billboard.slice';
export * from './marketplace.slice';
export * from './notification.slice';
export * from './gamification.slice';
export * from './analytics.slice';
export * from './admin.slice';
export * from './ui.slice';

// Export combined reducers object (for root reducer)
export const reducers = {
  auth: authReducer,
  user: userReducer,
  wallet: walletReducer,
  campaign: campaignReducer,
  room: roomReducer,
  billboard: billboardReducer,
  marketplace: marketplaceReducer,
  notification: notificationReducer,
  gamification: gamificationReducer,
  analytics: analyticsReducer,
  admin: adminReducer,
  ui: uiReducer,
};

// Export slice names as enum for easy reference
export enum SliceName {
  AUTH = 'auth',
  USER = 'user',
  WALLET = 'wallet',
  CAMPAIGN = 'campaign',
  ROOM = 'room',
  BILLBOARD = 'billboard',
  MARKETPLACE = 'marketplace',
  NOTIFICATION = 'notification',
  GAMIFICATION = 'gamification',
  ANALYTICS = 'analytics',
  ADMIN = 'admin',
  UI = 'ui',
}

// Export slice paths for selectors
export const slicePaths = {
  [SliceName.AUTH]: (state: any) => state.auth,
  [SliceName.USER]: (state: any) => state.user,
  [SliceName.WALLET]: (state: any) => state.wallet,
  [SliceName.CAMPAIGN]: (state: any) => state.campaign,
  [SliceName.ROOM]: (state: any) => state.room,
  [SliceName.BILLBOARD]: (state: any) => state.billboard,
  [SliceName.MARKETPLACE]: (state: any) => state.marketplace,
  [SliceName.NOTIFICATION]: (state: any) => state.notification,
  [SliceName.GAMIFICATION]: (state: any) => state.gamification,
  [SliceName.ANALYTICS]: (state: any) => state.analytics,
  [SliceName.ADMIN]: (state: any) => state.admin,
  [SliceName.UI]: (state: any) => state.ui,
};

// Export type for all slice states
export interface RootState {
  auth: ReturnType<typeof authReducer>;
  user: ReturnType<typeof userReducer>;
  wallet: ReturnType<typeof walletReducer>;
  campaign: ReturnType<typeof campaignReducer>;
  room: ReturnType<typeof roomReducer>;
  billboard: ReturnType<typeof billboardReducer>;
  marketplace: ReturnType<typeof marketplaceReducer>;
  notification: ReturnType<typeof notificationReducer>;
  gamification: ReturnType<typeof gamificationReducer>;
  analytics: ReturnType<typeof analyticsReducer>;
  admin: ReturnType<typeof adminReducer>;
  ui: ReturnType<typeof uiReducer>;
}

// Default export
export default reducers;