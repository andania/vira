/**
 * Engagement Socket Handler
 * Manages real-time engagement actions (likes, comments, shares, etc.)
 */

import { Server, Socket } from 'socket.io';
import { logger } from '../../logger';
import { redis } from '../../cache/redis.client';
import { prisma } from '../../database/client';
import { emitToUser, emitToRoom } from '../socket.server';
import { notificationService } from '../../../services/notification.service';
import { rewardService } from '../../../services/reward.service';
import { DEFAULT_REWARD_WEIGHTS } from '@viraz/shared';

export const engagementHandler = (io: Server, socket: Socket) => {
  const userId = socket.data.user.id;

  // Handle like action
  socket.on('engagement:like', async ({ targetType, targetId }, callback) => {
    try {
      // Check if already liked
      const existingLike = await prisma.like.findUnique({
        where: {
          userId_targetType_targetId: {
            userId,
            targetType,
            targetId,
          },
        },
      });

      if (existingLike) {
        // Unlike
        await prisma.like.delete({
          where: {
            userId_targetType_targetId: {
              userId,
              targetType,
              targetId,
            },
          },
        });

        // Update counts
        await this.updateEngagementCounts(targetType, targetId, 'like', -1);

        // Notify room
        emitToRoom(`${targetType}:${targetId}`, 'engagement:unliked', {
          userId,
          targetType,
          targetId,
        });

        callback({ action: 'unliked' });
      } else {
        // Create like
        const like = await prisma.like.create({
          data: {
            userId,
            targetType,
            targetId,
          },
        });

        // Award CAP
        const reward = await rewardService.awardReward({
          userId,
          action: 'like',
          targetType,
          targetId,
          amount: DEFAULT_REWARD_WEIGHTS.like,
        });

        // Update counts
        await this.updateEngagementCounts(targetType, targetId, 'like', 1);

        // Notify room
        emitToRoom(`${targetType}:${targetId}`, 'engagement:liked', {
          userId,
          targetType,
          targetId,
          timestamp: like.createdAt,
        });

        // Notify content owner if applicable
        await this.notifyContentOwner(targetType, targetId, 'like', userId);

        callback({
          action: 'liked',
          reward: reward.capEarned,
        });
      }
    } catch (error) {
      logger.error('Error processing like:', error);
      callback({ error: 'Failed to process like' });
    }
  });

  // Handle comment action
  socket.on('engagement:comment', async ({ targetType, targetId, content, parentId }, callback) => {
    try {
      // Create comment
      const comment = await prisma.comment.create({
        data: {
          userId,
          targetType,
          targetId,
          content,
          parentId,
        },
        include: {
          user: {
            select: {
              username: true,
              profile: {
                select: { avatarUrl: true, displayName: true },
              },
            },
          },
        },
      });

      // Award CAP
      const reward = await rewardService.awardReward({
        userId,
        action: 'comment',
        targetType,
        targetId,
        amount: DEFAULT_REWARD_WEIGHTS.comment,
      });

      // Update comment count
      await this.updateEngagementCounts(targetType, targetId, 'comment', 1);

      // Notify room
      emitToRoom(`${targetType}:${targetId}`, 'engagement:comment:new', {
        id: comment.id,
        userId,
        username: comment.user.username,
        avatar: comment.user.profile?.avatarUrl,
        displayName: comment.user.profile?.displayName,
        content,
        parentId,
        createdAt: comment.createdAt,
        reward: reward.capEarned,
      });

      // Notify content owner
      await this.notifyContentOwner(targetType, targetId, 'comment', userId, content);

      // Handle mentions in comment
      const mentions = content.match(/@(\w+)/g);
      if (mentions) {
        for (const mention of mentions) {
          const mentionedUsername = mention.slice(1);
          const mentionedUser = await prisma.user.findUnique({
            where: { username: mentionedUsername },
          });
          if (mentionedUser && mentionedUser.id !== userId) {
            await notificationService.create({
              userId: mentionedUser.id,
              type: 'ENGAGEMENT',
              title: '📨 You were mentioned',
              body: `${comment.user.username} mentioned you in a comment`,
              data: {
                screen: targetType,
                action: 'view',
                id: targetId,
                commentId: comment.id,
              },
            });
          }
        }
      }

      callback({
        success: true,
        commentId: comment.id,
        reward: reward.capEarned,
      });

    } catch (error) {
      logger.error('Error posting comment:', error);
      callback({ error: 'Failed to post comment' });
    }
  });

  // Handle share action
  socket.on('engagement:share', async ({ targetType, targetId, platform }, callback) => {
    try {
      // Create share record
      const share = await prisma.share.create({
        data: {
          userId,
          targetType,
          targetId,
          platform,
        },
      });

      // Award CAP
      const reward = await rewardService.awardReward({
        userId,
        action: 'share',
        targetType,
        targetId,
        amount: DEFAULT_REWARD_WEIGHTS.share,
      });

      // Update share count
      await this.updateEngagementCounts(targetType, targetId, 'share', 1);

      // Generate share URL
      const shareUrl = await this.generateShareUrl(targetType, targetId, platform);

      // Notify room
      emitToRoom(`${targetType}:${targetId}`, 'engagement:shared', {
        userId,
        targetType,
        targetId,
        platform,
        timestamp: share.createdAt,
      });

      callback({
        success: true,
        shareUrl,
        reward: reward.capEarned,
      });

    } catch (error) {
      logger.error('Error sharing content:', error);
      callback({ error: 'Failed to share' });
    }
  });

  // Handle click link action
  socket.on('engagement:click', async ({ targetType, targetId, url }, callback) => {
    try {
      // Record click
      const click = await prisma.contentClick.create({
        data: {
          userId,
          targetType,
          targetId,
          destinationUrl: url,
        },
      });

      // Award CAP
      const reward = await rewardService.awardReward({
        userId,
        action: 'click_link',
        targetType,
        targetId,
        amount: DEFAULT_REWARD_WEIGHTS.click_link,
      });

      // Update click count
      await this.updateEngagementCounts(targetType, targetId, 'click', 1);

      callback({
        success: true,
        reward: reward.capEarned,
      });

    } catch (error) {
      logger.error('Error recording click:', error);
      callback({ error: 'Failed to record click' });
    }
  });

  // Handle suggestion action
  socket.on('engagement:suggest', async ({ targetType, targetId, title, content, category }, callback) => {
    try {
      // Create suggestion
      const suggestion = await prisma.suggestion.create({
        data: {
          userId,
          targetType,
          targetId,
          title,
          content,
          category,
        },
      });

      // Award CAP
      const reward = await rewardService.awardReward({
        userId,
        action: 'suggest',
        targetType,
        targetId,
        amount: DEFAULT_REWARD_WEIGHTS.suggest,
      });

      // Notify content owner
      await this.notifyContentOwner(targetType, targetId, 'suggestion', userId, title);

      callback({
        success: true,
        suggestionId: suggestion.id,
        reward: reward.capEarned,
      });

    } catch (error) {
      logger.error('Error submitting suggestion:', error);
      callback({ error: 'Failed to submit suggestion' });
    }
  });

  // Handle reaction (for live rooms)
  socket.on('engagement:reaction', async ({ roomId, reaction }) => {
    try {
      // Broadcast reaction to room
      socket.to(`room:${roomId}`).emit('engagement:reaction:new', {
        userId,
        reaction,
        timestamp: Date.now(),
      });

      // Track reaction in Redis
      await redis.hincrby(`room:${roomId}:reactions`, reaction, 1);

      // Award small CAP for reaction
      await rewardService.awardReward({
        userId,
        action: 'reaction',
        targetType: 'room',
        targetId: roomId,
        amount: 5, // Small reward for reactions
      });

    } catch (error) {
      logger.error('Error sending reaction:', error);
    }
  });

  // Handle view action (track content views)
  socket.on('engagement:view', async ({ targetType, targetId, duration }) => {
    try {
      // Record view
      const view = await prisma.contentView.create({
        data: {
          userId,
          targetType,
          targetId,
          viewDuration: duration,
        },
      });

      // Update view count
      await this.updateEngagementCounts(targetType, targetId, 'view', 1);

      // Award CAP if watched significant portion
      if (duration && duration > 30) { // More than 30 seconds
        await rewardService.awardReward({
          userId,
          action: 'view',
          targetType,
          targetId,
          amount: DEFAULT_REWARD_WEIGHTS.view,
        });
      }

    } catch (error) {
      logger.error('Error recording view:', error);
    }
  });

  // Get engagement stats for content
  socket.on('engagement:stats', async ({ targetType, targetId }, callback) => {
    try {
      const cacheKey = `engagement:stats:${targetType}:${targetId}`;
      
      // Try to get from cache
      let stats = await redis.get(cacheKey);
      
      if (!stats) {
        // Get from database
        const [likes, comments, shares, views] = await Promise.all([
          prisma.like.count({ where: { targetType, targetId } }),
          prisma.comment.count({ where: { targetType, targetId } }),
          prisma.share.count({ where: { targetType, targetId } }),
          prisma.contentView.count({ where: { targetType, targetId } }),
        ]);

        stats = JSON.stringify({
          likes,
          comments,
          shares,
          views,
        });

        // Cache for 5 minutes
        await redis.setex(cacheKey, 300, stats);
      }

      callback({ stats: JSON.parse(stats) });

    } catch (error) {
      logger.error('Error getting engagement stats:', error);
      callback({ error: 'Failed to get stats' });
    }
  });

  // Helper: Update engagement counts in Redis
  this.updateEngagementCounts = async (targetType: string, targetId: string, action: string, increment: number) => {
    const key = `engagement:counts:${targetType}:${targetId}`;
    await redis.hincrby(key, action, increment);
    await redis.expire(key, 86400); // 24 hours
  };

  // Helper: Notify content owner of engagement
  this.notifyContentOwner = async (targetType: string, targetId: string, action: string, actorId: string, extra?: string) => {
    try {
      let ownerId: string | null = null;

      // Find content owner based on type
      switch (targetType) {
        case 'ad':
          const ad = await prisma.ad.findUnique({
            where: { id: targetId },
            include: { campaign: { include: { brand: true } } },
          });
          ownerId = ad?.campaign?.brand?.sponsorId || null;
          break;
        case 'room':
          const room = await prisma.room.findUnique({
            where: { id: targetId },
            include: { hosts: true },
          });
          ownerId = room?.hosts[0]?.userId || null;
          break;
        case 'comment':
          const comment = await prisma.comment.findUnique({
            where: { id: targetId },
          });
          ownerId = comment?.userId || null;
          break;
        case 'product':
          const product = await prisma.product.findUnique({
            where: { id: targetId },
            include: { brand: true },
          });
          ownerId = product?.brand?.sponsorId || null;
          break;
      }

      // Send notification to owner if not self
      if (ownerId && ownerId !== actorId) {
        const actor = await prisma.user.findUnique({
          where: { id: actorId },
          select: { username: true },
        });

        let title = '';
        let body = '';

        switch (action) {
          case 'like':
            title = '❤️ New Like';
            body = `${actor?.username} liked your ${targetType}`;
            break;
          case 'comment':
            title = '💬 New Comment';
            body = `${actor?.username} commented: ${extra?.substring(0, 50)}...`;
            break;
          case 'share':
            title = '📤 New Share';
            body = `${actor?.username} shared your ${targetType}`;
            break;
          case 'suggestion':
            title = '💡 New Suggestion';
            body = `${actor?.username} suggested: ${extra}`;
            break;
        }

        await notificationService.create({
          userId: ownerId,
          type: 'ENGAGEMENT',
          title,
          body,
          data: {
            screen: targetType,
            action: 'view',
            id: targetId,
            actorId,
          },
        });
      }
    } catch (error) {
      logger.error('Error notifying content owner:', error);
    }
  };

  // Helper: Generate share URL
  this.generateShareUrl = async (targetType: string, targetId: string, platform: string): Promise<string> => {
    const baseUrl = process.env.FRONTEND_URL || 'https://viraz.com';
    let path = '';

    switch (targetType) {
      case 'ad':
        path = `/billboard/ad/${targetId}`;
        break;
      case 'room':
        path = `/rooms/${targetId}`;
        break;
      case 'product':
        path = `/marketplace/product/${targetId}`;
        break;
      case 'campaign':
        path = `/campaigns/${targetId}`;
        break;
      default:
        path = `/${targetType}/${targetId}`;
    }

    const fullUrl = `${baseUrl}${path}`;

    // Generate platform-specific share URLs
    switch (platform) {
      case 'twitter':
        return `https://twitter.com/intent/tweet?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent('Check this out on VIRAZ!')}`;
      case 'facebook':
        return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`;
      case 'whatsapp':
        return `https://wa.me/?text=${encodeURIComponent(fullUrl)}`;
      case 'telegram':
        return `https://t.me/share/url?url=${encodeURIComponent(fullUrl)}`;
      default:
        return fullUrl;
    }
  };
};

export default engagementHandler;