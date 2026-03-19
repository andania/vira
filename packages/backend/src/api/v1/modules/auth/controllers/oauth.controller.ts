/**
 * OAuth Controller
 * Handles OAuth authentication (Google, Facebook, Apple)
 */

import { Request, Response } from 'express';
import { prisma } from '../../../../../core/database/client';
import { authService } from '../services/auth.service';
import { jwtService } from '../services/jwt.service';
import { logger } from '../../../../../core/logger';
import { config } from '../../../../../config';
import axios from 'axios';
import { OAuth2Client } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';

const googleClient = new OAuth2Client(
  config.googleClientId,
  config.googleClientSecret,
  `${process.env.API_URL}/api/v1/auth/oauth/google/callback`
);

export class OAuthController {
  /**
   * Google OAuth login
   */
  async googleLogin(req: Request, res: Response) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_TOKEN',
            message: 'Google token is required',
          },
        });
      }

      // Verify Google token
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: config.googleClientId,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error('Invalid Google token');
      }

      const { email, name, picture, sub } = payload;

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { email },
        include: { profile: true },
      });

      if (!user) {
        // Create new user
        const username = email?.split('@')[0] + '_' + Math.random().toString(36).substring(7);
        
        user = await prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              username,
              email: email!,
              password: uuidv4(), // Random password (user will use OAuth)
              accountType: 'USER',
              status: 'ACTIVE',
              emailVerified: true,
            },
          });

          await tx.userProfile.create({
            data: {
              userId: newUser.id,
              displayName: name,
              avatarUrl: picture,
            },
          });

          await tx.userPreference.create({
            data: {
              userId: newUser.id,
            },
          });

          await tx.capWallet.create({
            data: {
              userId: newUser.id,
              balance: 0,
              lifetimeEarned: 0,
              lifetimeSpent: 0,
            },
          });

          // Create OAuth account link
          await tx.oAuthAccount.create({
            data: {
              userId: newUser.id,
              provider: 'google',
              providerUserId: sub,
              providerEmail: email,
            },
          });

          return newUser;
        });
      } else {
        // Check if OAuth account is linked
        const oauthAccount = await prisma.oAuthAccount.findFirst({
          where: {
            userId: user.id,
            provider: 'google',
          },
        });

        if (!oauthAccount) {
          // Link Google account
          await prisma.oAuthAccount.create({
            data: {
              userId: user.id,
              provider: 'google',
              providerUserId: sub,
              providerEmail: email,
            },
          });
        }
      }

      // Generate tokens
      const accessToken = jwtService.generateAccessToken({
        sub: user.id,
        email: user.email,
        role: user.accountType,
      });

      const refreshToken = jwtService.generateRefreshToken({
        sub: user.id,
        email: user.email,
        role: user.accountType,
      });

      // Create session
      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'];

      await prisma.userSession.create({
        data: {
          userId: user.id,
          sessionToken: uuidv4(),
          refreshToken,
          ipAddress,
          userAgent,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          lastActivity: new Date(),
          isActive: true,
        },
      });

      // Set cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.json({
        success: true,
        data: {
          accessToken,
          expiresIn: 15 * 60, // 15 minutes
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            accountType: user.accountType,
            displayName: user.profile?.displayName,
            avatarUrl: user.profile?.avatarUrl,
          },
        },
      });
    } catch (error) {
      logger.error('Error in googleLogin:', error);
      return res.status(401).json({
        success: false,
        error: {
          code: 'OAUTH_ERROR',
          message: 'Google authentication failed',
        },
      });
    }
  }

  /**
   * Facebook OAuth login
   */
  async facebookLogin(req: Request, res: Response) {
    try {
      const { accessToken } = req.body;

      if (!accessToken) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_TOKEN',
            message: 'Facebook access token is required',
          },
        });
      }

      // Verify Facebook token
      const response = await axios.get(
        `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`
      );

      const { id, name, email, picture } = response.data;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_EMAIL',
            message: 'Email is required from Facebook',
          },
        });
      }

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { email },
        include: { profile: true },
      });

      if (!user) {
        // Create new user
        const username = email.split('@')[0] + '_' + Math.random().toString(36).substring(7);
        
        user = await prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              username,
              email,
              password: uuidv4(),
              accountType: 'USER',
              status: 'ACTIVE',
              emailVerified: true,
            },
          });

          await tx.userProfile.create({
            data: {
              userId: newUser.id,
              displayName: name,
              avatarUrl: picture?.data?.url,
            },
          });

          await tx.userPreference.create({
            data: {
              userId: newUser.id,
            },
          });

          await tx.capWallet.create({
            data: {
              userId: newUser.id,
              balance: 0,
              lifetimeEarned: 0,
              lifetimeSpent: 0,
            },
          });

          await tx.oAuthAccount.create({
            data: {
              userId: newUser.id,
              provider: 'facebook',
              providerUserId: id,
              providerEmail: email,
            },
          });

          return newUser;
        });
      } else {
        // Check if OAuth account is linked
        const oauthAccount = await prisma.oAuthAccount.findFirst({
          where: {
            userId: user.id,
            provider: 'facebook',
          },
        });

        if (!oauthAccount) {
          await prisma.oAuthAccount.create({
            data: {
              userId: user.id,
              provider: 'facebook',
              providerUserId: id,
              providerEmail: email,
            },
          });
        }
      }

      // Generate tokens
      const accessTokenJWT = jwtService.generateAccessToken({
        sub: user.id,
        email: user.email,
        role: user.accountType,
      });

      const refreshToken = jwtService.generateRefreshToken({
        sub: user.id,
        email: user.email,
        role: user.accountType,
      });

      // Create session
      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'];

      await prisma.userSession.create({
        data: {
          userId: user.id,
          sessionToken: uuidv4(),
          refreshToken,
          ipAddress,
          userAgent,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          lastActivity: new Date(),
          isActive: true,
        },
      });

      // Set cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.json({
        success: true,
        data: {
          accessToken: accessTokenJWT,
          expiresIn: 15 * 60,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            accountType: user.accountType,
            displayName: user.profile?.displayName,
            avatarUrl: user.profile?.avatarUrl,
          },
        },
      });
    } catch (error) {
      logger.error('Error in facebookLogin:', error);
      return res.status(401).json({
        success: false,
        error: {
          code: 'OAUTH_ERROR',
          message: 'Facebook authentication failed',
        },
      });
    }
  }

  /**
   * Apple OAuth login
   */
  async appleLogin(req: Request, res: Response) {
    try {
      const { identityToken, user: appleUser } = req.body;

      if (!identityToken) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_TOKEN',
            message: 'Apple identity token is required',
          },
        });
      }

      // Verify Apple token (simplified - in production, use apple-signin-auth)
      // This is a placeholder for actual Apple token verification
      const decoded = JSON.parse(Buffer.from(identityToken.split('.')[1], 'base64').toString());
      
      const { sub, email } = decoded;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_EMAIL',
            message: 'Email is required from Apple',
          },
        });
      }

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { email },
        include: { profile: true },
      });

      if (!user) {
        // Create new user
        const username = email.split('@')[0] + '_' + Math.random().toString(36).substring(7);
        
        user = await prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              username,
              email,
              password: uuidv4(),
              accountType: 'USER',
              status: 'ACTIVE',
              emailVerified: true,
            },
          });

          await tx.userProfile.create({
            data: {
              userId: newUser.id,
              displayName: appleUser?.name?.firstName + ' ' + appleUser?.name?.lastName || username,
            },
          });

          await tx.userPreference.create({
            data: {
              userId: newUser.id,
            },
          });

          await tx.capWallet.create({
            data: {
              userId: newUser.id,
              balance: 0,
              lifetimeEarned: 0,
              lifetimeSpent: 0,
            },
          });

          await tx.oAuthAccount.create({
            data: {
              userId: newUser.id,
              provider: 'apple',
              providerUserId: sub,
              providerEmail: email,
            },
          });

          return newUser;
        });
      } else {
        // Check if OAuth account is linked
        const oauthAccount = await prisma.oAuthAccount.findFirst({
          where: {
            userId: user.id,
            provider: 'apple',
          },
        });

        if (!oauthAccount) {
          await prisma.oAuthAccount.create({
            data: {
              userId: user.id,
              provider: 'apple',
              providerUserId: sub,
              providerEmail: email,
            },
          });
        }
      }

      // Generate tokens
      const accessTokenJWT = jwtService.generateAccessToken({
        sub: user.id,
        email: user.email,
        role: user.accountType,
      });

      const refreshToken = jwtService.generateRefreshToken({
        sub: user.id,
        email: user.email,
        role: user.accountType,
      });

      // Create session
      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'];

      await prisma.userSession.create({
        data: {
          userId: user.id,
          sessionToken: uuidv4(),
          refreshToken,
          ipAddress,
          userAgent,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          lastActivity: new Date(),
          isActive: true,
        },
      });

      // Set cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.json({
        success: true,
        data: {
          accessToken: accessTokenJWT,
          expiresIn: 15 * 60,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            accountType: user.accountType,
            displayName: user.profile?.displayName,
            avatarUrl: user.profile?.avatarUrl,
          },
        },
      });
    } catch (error) {
      logger.error('Error in appleLogin:', error);
      return res.status(401).json({
        success: false,
        error: {
          code: 'OAUTH_ERROR',
          message: 'Apple authentication failed',
        },
      });
    }
  }

  /**
   * Link OAuth account to existing user
   */
  async linkAccount(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { provider, accessToken } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      let providerUserId: string;
      let providerEmail: string;

      // Get provider info based on provider
      if (provider === 'google') {
        const ticket = await googleClient.verifyIdToken({
          idToken: accessToken,
          audience: config.googleClientId,
        });
        const payload = ticket.getPayload();
        providerUserId = payload?.sub!;
        providerEmail = payload?.email!;
      } else if (provider === 'facebook') {
        const response = await axios.get(
          `https://graph.facebook.com/me?fields=id,email&access_token=${accessToken}`
        );
        providerUserId = response.data.id;
        providerEmail = response.data.email;
      } else {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PROVIDER',
            message: 'Invalid OAuth provider',
          },
        });
      }

      // Check if account already linked
      const existing = await prisma.oAuthAccount.findFirst({
        where: {
          provider,
          providerUserId,
        },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ALREADY_LINKED',
            message: 'This account is already linked to another user',
          },
        });
      }

      // Link account
      await prisma.oAuthAccount.create({
        data: {
          userId,
          provider,
          providerUserId,
          providerEmail,
        },
      });

      return res.json({
        success: true,
        message: 'Account linked successfully',
      });
    } catch (error) {
      logger.error('Error in linkAccount:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to link account',
        },
      });
    }
  }

  /**
   * Unlink OAuth account
   */
  async unlinkAccount(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { provider } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      // Check if user has password set (can't unlink last auth method)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true },
      });

      const oauthCount = await prisma.oAuthAccount.count({
        where: { userId },
      });

      if (oauthCount === 1 && user?.password === uuidv4()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'LAST_AUTH_METHOD',
            message: 'Cannot unlink last authentication method',
          },
        });
      }

      // Unlink account
      await prisma.oAuthAccount.deleteMany({
        where: {
          userId,
          provider,
        },
      });

      return res.json({
        success: true,
        message: 'Account unlinked successfully',
      });
    } catch (error) {
      logger.error('Error in unlinkAccount:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to unlink account',
        },
      });
    }
  }

  /**
   * Get linked OAuth accounts
   */
  async getLinkedAccounts(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      const accounts = await prisma.oAuthAccount.findMany({
        where: { userId },
        select: {
          provider: true,
          providerEmail: true,
          createdAt: true,
        },
      });

      return res.json({
        success: true,
        data: accounts,
      });
    } catch (error) {
      logger.error('Error in getLinkedAccounts:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get linked accounts',
        },
      });
    }
  }
}

export const oauthController = new OAuthController();