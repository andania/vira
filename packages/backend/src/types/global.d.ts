/**
 * Global Type Definitions
 */

import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { Queue } from 'bull';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Server
      NODE_ENV: 'development' | 'staging' | 'production' | 'test';
      PORT: string;
      API_VERSION: string;
      API_PREFIX: string;
      API_URL: string;
      FRONTEND_URL: string;
      CORS_ORIGIN: string;

      // Database
      DATABASE_URL: string;
      DATABASE_POOL_MIN: string;
      DATABASE_POOL_MAX: string;
      DATABASE_IDLE_TIMEOUT: string;
      DATABASE_CONNECTION_TIMEOUT: string;

      // Redis
      REDIS_URL: string;
      REDIS_PASSWORD?: string;
      REDIS_DB: string;
      REDIS_KEY_PREFIX: string;

      // JWT
      JWT_SECRET: string;
      JWT_REFRESH_SECRET: string;
      JWT_ACCESS_EXPIRY: string;
      JWT_REFRESH_EXPIRY: string;
      JWT_ISSUER: string;
      JWT_AUDIENCE: string;

      // Email
      SMTP_HOST: string;
      SMTP_PORT: string;
      SMTP_SECURE: string;
      SMTP_USER: string;
      SMTP_PASS: string;
      SMTP_FROM: string;
      SMTP_FROM_NAME: string;

      // SMS
      TWILIO_ACCOUNT_SID?: string;
      TWILIO_AUTH_TOKEN?: string;
      TWILIO_PHONE_NUMBER?: string;

      // Push Notifications
      FIREBASE_PROJECT_ID?: string;
      FIREBASE_PRIVATE_KEY?: string;
      FIREBASE_CLIENT_EMAIL?: string;

      // Payment
      STRIPE_SECRET_KEY?: string;
      STRIPE_WEBHOOK_SECRET?: string;
      PAYPAL_CLIENT_ID?: string;
      PAYPAL_CLIENT_SECRET?: string;
      PAYPAL_MODE?: 'sandbox' | 'live';
      FLUTTERWAVE_SECRET_KEY?: string;
      PAYSTACK_SECRET_KEY?: string;

      // Storage
      AWS_ACCESS_KEY_ID?: string;
      AWS_SECRET_ACCESS_KEY?: string;
      AWS_REGION?: string;
      AWS_S3_BUCKET?: string;
      CLOUDINARY_CLOUD_NAME?: string;
      CLOUDINARY_API_KEY?: string;
      CLOUDINARY_API_SECRET?: string;

      // Monitoring
      SENTRY_DSN?: string;
      NEW_RELIC_LICENSE_KEY?: string;

      // Rate Limiting
      RATE_LIMIT_WINDOW_MS: string;
      RATE_LIMIT_MAX_PUBLIC: string;
      RATE_LIMIT_MAX_AUTH: string;
      RATE_LIMIT_MAX_SPONSOR: string;
      RATE_LIMIT_MAX_ADMIN: string;

      // Security
      BCRYPT_ROUNDS: string;
      SESSION_SECRET: string;
      ENCRYPTION_KEY: string;
      MAX_LOGIN_ATTEMPTS: string;
      LOGIN_LOCKOUT_TIME: string;

      // OAuth
      GOOGLE_CLIENT_ID?: string;
      GOOGLE_CLIENT_SECRET?: string;
      FACEBOOK_APP_ID?: string;
      FACEBOOK_APP_SECRET?: string;
      APPLE_CLIENT_ID?: string;
      APPLE_TEAM_ID?: string;
      APPLE_KEY_ID?: string;
      APPLE_PRIVATE_KEY?: string;
    }
  }

  // Global variables
  var prisma: PrismaClient;
  var redis: Redis;
  var queues: Record<string, Queue>;

  // Global utility types
  type UUID = string;
  type DateTime = string | Date;
  type Email = string;
  type PhoneNumber = string;
  type URL = string;
  type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
  interface JSONObject {
    [key: string]: JSONValue;
  }
  type JSONArray = JSONValue[];
}

// Extend JSON with BigInt support
interface JSON {
  stringify(
    value: any,
    replacer?: (this: any, key: string, value: any) => any,
    space?: string | number
  ): string;
}

// Utility types
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

export type Nullable<T> = T | null;

export type AsyncReturnType<T extends (...args: any) => Promise<any>> = T extends (
  ...args: any
) => Promise<infer R>
  ? R
  : any;

export type Constructor<T = any> = new (...args: any[]) => T;

export type Await<T> = T extends Promise<infer U> ? U : T;