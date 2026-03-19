/**
 * Wallet Module Index
 * Exports all wallet module components
 */

// Controllers
export { walletController } from './controllers/wallet.controller';
export { adminWalletController } from './controllers/admin-wallet.controller';
export { webhookController } from './controllers/webhook.controller';
export { transactionController } from './controllers/transaction.controller';
export { depositController } from './controllers/deposit.controller';
export { withdrawalController } from './controllers/withdrawal.controller';

// Services
export { walletService } from './services/wallet.service';
export { capEconomicsService } from './services/cap-economics.service';
export { paymentService } from './services/payment.service';
export { fraudDetectionService } from './services/fraud-detection.service';

// Repositories
export { walletRepository } from './repositories/wallet.repository';
export { transactionRepository } from './repositories/transaction.repository';
export { withdrawalRepository } from './repositories/withdrawal.repository';
export { depositRepository } from './repositories/deposit.repository';

// Routes
export { walletRouter } from './routes';

// Module configuration
export const walletModule = {
  name: 'wallet',
  version: '1.0.0',
  description: 'CAP wallet and transaction management',
  controllers: [
    walletController,
    adminWalletController,
    webhookController,
    transactionController,
    depositController,
    withdrawalController,
  ],
  services: [
    walletService,
    capEconomicsService,
    paymentService,
    fraudDetectionService,
  ],
  repositories: [
    walletRepository,
    transactionRepository,
    withdrawalRepository,
    depositRepository,
  ],
};