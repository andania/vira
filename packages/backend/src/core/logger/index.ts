/**
 * Logger Index
 * Exports configured logger instance
 */

import { createLogger } from './winston.logger';

export const logger = createLogger();

export default logger;