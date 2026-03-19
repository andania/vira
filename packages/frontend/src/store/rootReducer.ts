/**
 * Root Reducer
 * Combines all reducers and provides state reset functionality
 */

import { combineReducers } from '@reduxjs/toolkit';
import authReducer from './slices/auth.slice';
import userReducer from './slices/user.slice';
import walletReducer from './slices/wallet.slice';
import campaignReducer from './slices/campaign.slice';
import roomReducer from './slices/room.slice';
import billboardReducer from './slices/billboard.slice';
import marketplaceReducer from './slices/marketplace.slice';
import notificationReducer from './slices/notification.slice';
import gamificationReducer from './slices/gamification.slice';
import analyticsReducer from './slices/analytics.slice';
import adminReducer from './slices/admin.slice';
import uiReducer from './slices/ui.slice';

const appReducer = combineReducers({
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
});

export type RootState = ReturnType<typeof appReducer>;

// Root reducer with state reset functionality
const rootReducer = (state: RootState | undefined, action: any) => {
  // Reset all state on logout
  if (action.type === 'auth/logout/fulfilled' || action.type === 'auth/clearCredentials') {
    // Preserve only UI theme when logging out
    const theme = state?.ui.theme;
    state = undefined;
    if (theme) {
      return appReducer(state, action);
    }
  }
  return appReducer(state, action);
};

export default rootReducer;