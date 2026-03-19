/**
 * Logger Middleware
 * Logs Redux actions and state changes in development
 */

import { Middleware } from '@reduxjs/toolkit';

// Colors for different action types
const colors = {
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  default: '#6b7280',
};

/**
 * Get color based on action type
 */
const getActionColor = (type: string): string => {
  if (type.includes('fulfilled')) return colors.success;
  if (type.includes('rejected')) return colors.error;
  if (type.includes('pending')) return colors.warning;
  return colors.default;
};

/**
 * Format the action for logging
 */
const formatAction = (action: any): string => {
  const { type, payload, meta } = action;
  const color = getActionColor(type);
  
  return `%c ${type} %c ${
    payload ? `\nPayload: ${JSON.stringify(payload, null, 2)}` : ''
  } ${
    meta ? `\nMeta: ${JSON.stringify(meta, null, 2)}` : ''
  }`;
};

/**
 * Format the state diff
 */
const formatStateDiff = (prevState: any, nextState: any): string => {
  const changes: string[] = [];
  
  // Simple diffing for demo - in production you might want a proper diff library
  Object.keys(nextState).forEach(key => {
    if (JSON.stringify(prevState[key]) !== JSON.stringify(nextState[key])) {
      changes.push(`  ${key}:`);
      changes.push(`    - ${JSON.stringify(prevState[key])}`);
      changes.push(`    + ${JSON.stringify(nextState[key])}`);
    }
  });
  
  return changes.join('\n');
};

/**
 * Logger middleware
 */
export const loggerMiddleware: Middleware = (store) => (next) => (action) => {
  if (process.env.NODE_ENV !== 'development') {
    return next(action);
  }

  const prevState = store.getState();
  const result = next(action);
  const nextState = store.getState();
  
  const groupLabel = `Action: ${action.type}`;
  
  console.groupCollapsed(groupLabel);
  
  // Log action
  console.log(
    formatAction(action),
    `color: ${getActionColor(action.type)}; font-weight: bold;`,
    'color: #666; font-weight: normal;'
  );
  
  // Log prev state
  console.log('%c Prev State', 'color: #ef4444; font-weight: bold;', prevState);
  
  // Log next state
  console.log('%c Next State', 'color: #10b981; font-weight: bold;', nextState);
  
  // Log diff
  const diff = formatStateDiff(prevState, nextState);
  if (diff) {
    console.log('%c Diff', 'color: #3b82f6; font-weight: bold;', `\n${diff}`);
  }
  
  console.groupEnd();
  
  return result;
};

/**
 * Custom logger for API requests
 */
export const apiLogger = {
  request: (config: any) => {
    if (process.env.NODE_ENV !== 'development') return;
    
    console.groupCollapsed(`%c API Request %c ${config.method?.toUpperCase()} ${config.url}`, 
      'color: #3b82f6; font-weight: bold;',
      'color: #666; font-weight: normal;'
    );
    console.log('%c Config', 'color: #f59e0b; font-weight: bold;', config);
    if (config.data) {
      console.log('%c Data', 'color: #10b981; font-weight: bold;', config.data);
    }
    if (config.params) {
      console.log('%c Params', 'color: #10b981; font-weight: bold;', config.params);
    }
    console.groupEnd();
  },
  
  response: (response: any) => {
    if (process.env.NODE_ENV !== 'development') return;
    
    console.groupCollapsed(`%c API Response %c ${response.status} ${response.config.url}`,
      'color: #10b981; font-weight: bold;',
      'color: #666; font-weight: normal;'
    );
    console.log('%c Data', 'color: #10b981; font-weight: bold;', response.data);
    console.log('%c Headers', 'color: #f59e0b; font-weight: bold;', response.headers);
    console.groupEnd();
  },
  
  error: (error: any) => {
    if (process.env.NODE_ENV !== 'development') return;
    
    console.groupCollapsed(`%c API Error %c ${error.config?.url}`,
      'color: #ef4444; font-weight: bold;',
      'color: #666; font-weight: normal;'
    );
    console.log('%c Message', 'color: #ef4444; font-weight: bold;', error.message);
    if (error.response) {
      console.log('%c Response', 'color: #f59e0b; font-weight: bold;', error.response.data);
      console.log('%c Status', 'color: #f59e0b; font-weight: bold;', error.response.status);
    }
    console.log('%c Config', 'color: #3b82f6; font-weight: bold;', error.config);
    console.groupEnd();
  },
};

export default loggerMiddleware;