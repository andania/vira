/**
 * Seed Data - Test Users
 * Creates test users for development and testing
 */

import { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

// Helper to hash password
const hashPassword = (password: string): string => {
  return bcrypt.hashSync(password, SALT_ROUNDS);
};

// Test users data
export const testUsers = [
  {
    username: 'admin',
    email: 'admin@viraz.com',
    password: hashPassword('Admin123!'),
    accountType: 'ADMIN',
    status: 'ACTIVE',
    emailVerified: true,
    phoneVerified: true,
    profile: {
      firstName: 'System',
      lastName: 'Administrator',
      displayName: 'Admin',
    },
  },
  {
    username: 'moderator',
    email: 'moderator@viraz.com',
    password: hashPassword('Mod123!'),
    accountType: 'MODERATOR',
    status: 'ACTIVE',
    emailVerified: true,
    phoneVerified: true,
    profile: {
      firstName: 'Content',
      lastName: 'Moderator',
      displayName: 'Moderator',
    },
  },
  {
    username: 'john_doe',
    email: 'john@example.com',
    phone: '+1234567890',
    password: hashPassword('User123!'),
    accountType: 'USER',
    status: 'ACTIVE',
    emailVerified: true,
    phoneVerified: true,
    profile: {
      firstName: 'John',
      lastName: 'Doe',
      displayName: 'John Doe',
      bio: 'Tech enthusiast and early adopter',
      interests: ['technology', 'gadgets', 'innovation'],
    },
  },
  {
    username: 'jane_smith',
    email: 'jane@example.com',
    phone: '+1234567891',
    password: hashPassword('User123!'),
    accountType: 'USER',
    status: 'ACTIVE',
    emailVerified: true,
    phoneVerified: true,
    profile: {
      firstName: 'Jane',
      lastName: 'Smith',
      displayName: 'Jane Smith',
      bio: 'Fashion lover and trend setter',
      interests: ['fashion', 'beauty', 'lifestyle'],
    },
  },
  {
    username: 'tech_corp',
    email: 'info@techcorp.com',
    phone: '+1234567892',
    password: hashPassword('Sponsor123!'),
    accountType: 'SPONSOR',
    status: 'ACTIVE',
    emailVerified: true,
    phoneVerified: true,
    profile: {
      firstName: 'Tech',
      lastName: 'Corp',
      displayName: 'Tech Corp',
    },
    sponsor: {
      companyName: 'Tech Corp',
      registrationNumber: 'REG123456',
      taxId: 'TAX789012',
      businessType: 'Technology',
      businessCategory: 'Electronics',
      website: 'https://techcorp.com',
      verificationStatus: 'VERIFIED',
      subscriptionTier: 'professional',
      creditLimit: 50000,
    },
  },
  {
    username: 'fashion_brand',
    email: 'contact@fashionbrand.com',
    phone: '+1234567893',
    password: hashPassword('Sponsor123!'),
    accountType: 'SPONSOR',
    status: 'ACTIVE',
    emailVerified: true,
    phoneVerified: true,
    profile: {
      firstName: 'Fashion',
      lastName: 'Brand',
      displayName: 'Fashion Brand',
    },
    sponsor: {
      companyName: 'Fashion Brand Inc.',
      registrationNumber: 'REG789012',
      taxId: 'TAX345678',
      businessType: 'Retail',
      businessCategory: 'Fashion',
      website: 'https://fashionbrand.com',
      verificationStatus: 'VERIFIED',
      subscriptionTier: 'basic',
      creditLimit: 25000,
    },
  },
  {
    username: 'alice_wonder',
    email: 'alice@example.com',
    password: hashPassword('User123!'),
    accountType: 'USER',
    status: 'ACTIVE',
    emailVerified: true,
    profile: {
      firstName: 'Alice',
      lastName: 'Wonder',
      displayName: 'Alice Wonder',
      bio: 'Content creator and influencer',
      interests: ['lifestyle', 'travel', 'food'],
    },
  },
  {
    username: 'bob_builder',
    email: 'bob@example.com',
    password: hashPassword('User123!'),
    accountType: 'USER',
    status: 'ACTIVE',
    emailVerified: true,
    profile: {
      firstName: 'Bob',
      lastName: 'Builder',
      displayName: 'Bob Builder',
      bio: 'DIY enthusiast and home improvement expert',
      interests: ['home', 'diy', 'tools'],
    },
  },
];

// Test brands for sponsors
export const testBrands = [
  {
    name: 'TechCorp Electronics',
    description: 'Latest gadgets and electronics',
    industry: 'Electronics',
    sponsorUsername: 'tech_corp',
  },
  {
    name: 'TechCorp Gaming',
    description: 'Gaming accessories and gear',
    industry: 'Gaming',
    sponsorUsername: 'tech_corp',
  },
  {
    name: 'Fashion Brand Main',
    description: 'Trendy clothing and accessories',
    industry: 'Fashion',
    sponsorUsername: 'fashion_brand',
  },
  {
    name: 'Fashion Brand Shoes',
    description: 'Footwear collection',
    industry: 'Footwear',
    sponsorUsername: 'fashion_brand',
  },
];

// Test campaigns
export const testCampaigns = [
  {
    name: 'Summer Sale 2024',
    description: 'Biggest sale of the season!',
    objective: 'SALES',
    status: 'ACTIVE',
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    totalBudget: 10000,
    dailyBudget: 500,
    brandName: 'TechCorp Electronics',
  },
  {
    name: 'New Product Launch',
    description: 'Introducing our latest smartphone',
    objective: 'AWARENESS',
    status: 'ACTIVE',
    startDate: new Date(),
    endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    totalBudget: 50000,
    dailyBudget: 2000,
    brandName: 'TechCorp Electronics',
  },
  {
    name: 'Spring Collection',
    description: 'New fashion line for spring',
    objective: 'AWARENESS',
    status: 'SCHEDULED',
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    totalBudget: 15000,
    dailyBudget: 500,
    brandName: 'Fashion Brand Main',
  },
];

// Test products
export const testProducts = [
  {
    name: 'Smartphone X',
    description: 'Latest flagship smartphone with advanced features',
    priceFiat: 999.99,
    priceCap: 99999,
    stockQuantity: 50,
    sku: 'TECH-SM-001',
    brandName: 'TechCorp Electronics',
    categoryName: 'Electronics',
  },
  {
    name: 'Wireless Earbuds',
    description: 'High-quality wireless earbuds with noise cancellation',
    priceFiat: 149.99,
    priceCap: 14999,
    stockQuantity: 200,
    sku: 'TECH-EB-002',
    brandName: 'TechCorp Electronics',
    categoryName: 'Electronics',
  },
  {
    name: 'Gaming Mouse',
    description: 'Professional gaming mouse with RGB lighting',
    priceFiat: 79.99,
    priceCap: 7999,
    stockQuantity: 150,
    sku: 'TECH-GM-003',
    brandName: 'TechCorp Gaming',
    categoryName: 'Electronics',
  },
  {
    name: 'Designer T-Shirt',
    description: 'Premium cotton t-shirt with unique design',
    priceFiat: 49.99,
    priceCap: 4999,
    stockQuantity: 300,
    sku: 'FASH-TS-001',
    brandName: 'Fashion Brand Main',
    categoryName: 'Fashion',
  },
  {
    name: 'Slim Fit Jeans',
    description: 'Comfortable slim fit jeans',
    priceFiat: 89.99,
    priceCap: 8999,
    stockQuantity: 200,
    sku: 'FASH-JN-002',
    brandName: 'Fashion Brand Main',
    categoryName: 'Fashion',
  },
  {
    name: 'Running Shoes',
    description: 'Lightweight running shoes for athletes',
    priceFiat: 129.99,
    priceCap: 12999,
    stockQuantity: 100,
    sku: 'FASH-SH-003',
    brandName: 'Fashion Brand Shoes',
    categoryName: 'Footwear',
  },
];

// Test rooms
export const testRooms = [
  {
    name: 'Smartphone X Live Demo',
    description: 'Live demonstration of the new Smartphone X',
    roomType: 'LIVE_DEMO',
    status: 'LIVE',
    visibility: 'PUBLIC',
    maxParticipants: 500,
    brandName: 'TechCorp Electronics',
  },
  {
    name: 'Fashion Show 2024',
    description: 'Live fashion show featuring our spring collection',
    roomType: 'EVENT',
    status: 'SCHEDULED',
    visibility: 'PUBLIC',
    maxParticipants: 1000,
    scheduledStart: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    scheduledEnd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
    brandName: 'Fashion Brand Main',
  },
  {
    name: 'Gaming Accessories Q&A',
    description: 'Q&A session about our gaming accessories',
    roomType: 'COMMUNITY',
    status: 'LIVE',
    visibility: 'PUBLIC',
    maxParticipants: 200,
    brandName: 'TechCorp Gaming',
  },
];

// Helper to get user by username
export const getUserByUsername = (username: string) => {
  return testUsers.find(u => u.username === username);
};

// Helper to get sponsor by username
export const getSponsorByUsername = (username: string) => {
  const user = testUsers.find(u => u.username === username);
  return user?.sponsor;
};