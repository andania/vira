/**
 * Root Saga
 * Combines all sagas for side effects
 */

import { all, fork } from 'redux-saga/effects';

// Import sagas
import authSaga from './sagas/auth.saga';
import userSaga from './sagas/user.saga';
import walletSaga from './sagas/wallet.saga';
import campaignSaga from './sagas/campaign.saga';
import roomSaga from './sagas/room.saga';
import billboardSaga from './sagas/billboard.saga';
import marketplaceSaga from './sagas/marketplace.saga';
import notificationSaga from './sagas/notification.saga';
import gamificationSaga from './sagas/gamification.saga';
import analyticsSaga from './sagas/analytics.saga';
import adminSaga from './sagas/admin.saga';

export default function* rootSaga() {
  yield all([
    fork(authSaga),
    fork(userSaga),
    fork(walletSaga),
    fork(campaignSaga),
    fork(roomSaga),
    fork(billboardSaga),
    fork(marketplaceSaga),
    fork(notificationSaga),
    fork(gamificationSaga),
    fork(analyticsSaga),
    fork(adminSaga),
  ]);
}