/**
 * AI Content Moderation Service
 * Handles automated content moderation using AI
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';

export interface ModerationResult {
  flagged: boolean;
  score: number;
  categories: {
    spam: number;
    hate: number;
    violence: number;
    adult: number;
    harassment: number;
    selfHarm: number;
  };
  reasons: string[];
  action: 'allow' | 'flag' | 'block';
}

export interface ContentFlags {
  profanity: boolean;
  hateSpeech: boolean;
  spam: boolean;
  personalInfo: boolean;
  adult: boolean;
  violence: boolean;
}

export class ContentModerationService {
  private profanityList: string[] = [
    // This would be a comprehensive list of profane words
    'profanity1', 'profanity2', 'profanity3'
  ];

  private hateSpeechPatterns: RegExp[] = [
    /hate\s+group/i,
    /racial\s+slur/i,
    // More patterns
  ];

  private spamPatterns: RegExp[] = [
    /buy\s+now/i,
    /click\s+here/i,
    /free\s+money/i,
    /earn\s+fast/i,
    /bitcoin/i,
    /crypto/i,
    /viagra/i,
    /casino/i,
    /lottery/i,
    /winner/i,
  ];

  private personalInfoPatterns: RegExp[] = [
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // Phone numbers
    /\b\d{16}\b/, // Credit card
    /\b[A-Z]{2}\d{2}\s?\d{4}\s?\d{4}\b/, // Passport
    /\b\d{3}[-]?\d{2}[-]?\d{4}\b/, // SSN
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
  ];

  private adultPatterns: RegExp[] = [
    /porn/i,
    /xxx/i,
    /adult\s+content/i,
    // More patterns
  ];

  private violencePatterns: RegExp[] = [
    /kill/i,
    /murder/i,
    /bomb/i,
    /attack/i,
    /shoot/i,
    /stab/i,
    // More patterns
  ];

  /**
   * Moderate text content
   */
  async moderateText(text: string): Promise<ModerationResult> {
    try {
      const categories = {
        spam: 0,
        hate: 0,
        violence: 0,
        adult: 0,
        harassment: 0,
        selfHarm: 0,
      };

      const reasons: string[] = [];

      // Check for spam
      const spamScore = this.checkSpam(text);
      if (spamScore > 0) {
        categories.spam = spamScore;
        reasons.push('Potential spam content');
      }

      // Check for hate speech
      const hateScore = this.checkHateSpeech(text);
      if (hateScore > 0) {
        categories.hate = hateScore;
        reasons.push('Potential hate speech');
      }

      // Check for violence
      const violenceScore = this.checkViolence(text);
      if (violenceScore > 0) {
        categories.violence = violenceScore;
        reasons.push('Violent content');
      }

      // Check for adult content
      const adultScore = this.checkAdult(text);
      if (adultScore > 0) {
        categories.adult = adultScore;
        reasons.push('Adult content');
      }

      // Check for harassment
      const harassmentScore = this.checkHarassment(text);
      if (harassmentScore > 0) {
        categories.harassment = harassmentScore;
        reasons.push('Harassing content');
      }

      // Check for self-harm
      const selfHarmScore = this.checkSelfHarm(text);
      if (selfHarmScore > 0) {
        categories.selfHarm = selfHarmScore;
        reasons.push('Self-harm content');
      }

      // Check for personal information
      const personalInfoScore = this.checkPersonalInfo(text);
      if (personalInfoScore > 0) {
        categories.spam = Math.max(categories.spam, personalInfoScore);
        reasons.push('Contains personal information');
      }

      // Calculate overall score
      const overallScore = Math.max(...Object.values(categories));

      // Determine action
      let action: 'allow' | 'flag' | 'block' = 'allow';
      if (overallScore > 80) {
        action = 'block';
      } else if (overallScore > 50) {
        action = 'flag';
      }

      return {
        flagged: overallScore > 30,
        score: overallScore,
        categories,
        reasons: reasons.slice(0, 3), // Limit to top 3 reasons
        action,
      };
    } catch (error) {
      logger.error('Error moderating text:', error);
      return {
        flagged: false,
        score: 0,
        categories: {
          spam: 0,
          hate: 0,
          violence: 0,
          adult: 0,
          harassment: 0,
          selfHarm: 0,
        },
        reasons: [],
        action: 'allow',
      };
    }
  }

  /**
   * Check for spam content
   */
  private checkSpam(text: string): number {
    let score = 0;

    // Check for spam patterns
    for (const pattern of this.spamPatterns) {
      if (pattern.test(text)) {
        score += 20;
      }
    }

    // Check for excessive capitalization
    const upperCase = (text.match(/[A-Z]/g) || []).length;
    const totalChars = text.length;
    if (totalChars > 0 && upperCase / totalChars > 0.5) {
      score += 30;
    }

    // Check for repeated characters
    if (/(.)\1{4,}/.test(text)) {
      score += 20;
    }

    // Check for excessive punctuation
    const punctuation = (text.match(/[!?.,]/g) || []).length;
    if (punctuation > totalChars * 0.3) {
      score += 20;
    }

    return Math.min(score, 100);
  }

  /**
   * Check for hate speech
   */
  private checkHateSpeech(text: string): number {
    let score = 0;

    // Check for hate speech patterns
    for (const pattern of this.hateSpeechPatterns) {
      if (pattern.test(text)) {
        score += 40;
      }
    }

    // Check for racial/ethnic slurs
    // This would use a comprehensive list
    const racialSlurs = ['slur1', 'slur2'];
    for (const slur of racialSlurs) {
      if (text.toLowerCase().includes(slur)) {
        score += 50;
      }
    }

    return Math.min(score, 100);
  }

  /**
   * Check for violent content
   */
  private checkViolence(text: string): number {
    let score = 0;

    for (const pattern of this.violencePatterns) {
      if (pattern.test(text)) {
        score += 25;
      }
    }

    // Check for violent context
    const violenceWords = ['fight', 'beat', 'hurt', 'injure'];
    for (const word of violenceWords) {
      if (text.toLowerCase().includes(word)) {
        score += 15;
      }
    }

    return Math.min(score, 100);
  }

  /**
   * Check for adult content
   */
  private checkAdult(text: string): number {
    let score = 0;

    for (const pattern of this.adultPatterns) {
      if (pattern.test(text)) {
        score += 35;
      }
    }

    // Check for adult words
    const adultWords = ['sex', 'nude', 'explicit'];
    for (const word of adultWords) {
      if (text.toLowerCase().includes(word)) {
        score += 20;
      }
    }

    return Math.min(score, 100);
  }

  /**
   * Check for harassment
   */
  private checkHarassment(text: string): number {
    let score = 0;

    // Check for targeted attacks
    const harassmentPatterns = [
      /\@\w+\s+(?:stupid|idiot|dumb)/i,
      /you\'?re\s+(?:stupid|idiot|dumb)/i,
    ];

    for (const pattern of harassmentPatterns) {
      if (pattern.test(text)) {
        score += 40;
      }
    }

    // Check for threatening language
    const threatWords = ['threat', 'scare', 'afraid'];
    for (const word of threatWords) {
      if (text.toLowerCase().includes(word)) {
        score += 20;
      }
    }

    return Math.min(score, 100);
  }

  /**
   * Check for self-harm content
   */
  private checkSelfHarm(text: string): number {
    let score = 0;

    const selfHarmWords = [
      'suicide',
      'kill myself',
      'end my life',
      'self harm',
      'cut myself',
    ];

    for (const phrase of selfHarmWords) {
      if (text.toLowerCase().includes(phrase)) {
        score += 50;
      }
    }

    return Math.min(score, 100);
  }

  /**
   * Check for personal information
   */
  private checkPersonalInfo(text: string): number {
    let score = 0;

    for (const pattern of this.personalInfoPatterns) {
      if (pattern.test(text)) {
        score += 25;
      }
    }

    return Math.min(score, 100);
  }

  /**
   * Moderate image content (simplified)
   */
  async moderateImage(imageUrl: string): Promise<ModerationResult> {
    try {
      // This would integrate with an image moderation API
      // Simplified version for now
      return {
        flagged: false,
        score: 0,
        categories: {
          spam: 0,
          hate: 0,
          violence: 0,
          adult: 0,
          harassment: 0,
          selfHarm: 0,
        },
        reasons: [],
        action: 'allow',
      };
    } catch (error) {
      logger.error('Error moderating image:', error);
      return {
        flagged: false,
        score: 0,
        categories: {
          spam: 0,
          hate: 0,
          violence: 0,
          adult: 0,
          harassment: 0,
          selfHarm: 0,
        },
        reasons: [],
        action: 'allow',
      };
    }
  }

  /**
   * Get moderation statistics
   */
  async getModerationStats(): Promise<any> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const [totalModerated, flaggedContent, byCategory] = await Promise.all([
        prisma.contentFlag.count(),
        prisma.contentFlag.count({
          where: {
            createdAt: { gte: oneDayAgo },
          },
        }),
        prisma.contentFlag.groupBy({
          by: ['flagType'],
          where: {
            createdAt: { gte: oneDayAgo },
          },
          _count: true,
        }),
      ]);

      return {
        totalModerated,
        flaggedToday: flaggedContent,
        byCategory: byCategory.reduce((acc, curr) => {
          acc[curr.flagType] = curr._count;
          return acc;
        }, {} as Record<string, number>),
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Error getting moderation stats:', error);
      throw error;
    }
  }

  /**
   * Get moderation rules
   */
  getModerationRules(): any {
    return {
      spam: {
        patterns: this.spamPatterns.map(p => p.toString()),
        threshold: 50,
      },
      hateSpeech: {
        patterns: this.hateSpeechPatterns.map(p => p.toString()),
        threshold: 60,
      },
      violence: {
        patterns: this.violencePatterns.map(p => p.toString()),
        threshold: 70,
      },
      adult: {
        patterns: this.adultPatterns.map(p => p.toString()),
        threshold: 70,
      },
      personalInfo: {
        patterns: this.personalInfoPatterns.map(p => p.toString()),
        threshold: 80,
      },
    };
  }

  /**
   * Update moderation rules
   */
  async updateModerationRules(rules: any): Promise<void> {
    try {
      // This would update the moderation rules in database
      logger.info('Moderation rules updated', rules);
    } catch (error) {
      logger.error('Error updating moderation rules:', error);
      throw error;
    }
  }
}

export const contentModerationService = new ContentModerationService();