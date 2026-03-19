/**
 * Redux Store Configuration
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { 
  FLUSH, 
  REHYDRATE, 
  PAUSE, 
  PERSIST, 
  PURGE, 
  REGISTER 
} from 'redux-persist';

// Import slices
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

// Persist configuration
const persistConfig = {
  key: 'root',
  version: 1,
  storage,
  whitelist: ['auth', 'ui'], // Only persist auth and ui state
  blacklist: ['billboard', 'analytics', 'campaign'], // Don't persist these
};

// Root reducer
const rootReducer = combineReducers({
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

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Persistor
export const persistor = persistStore(store);

// Infer types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;