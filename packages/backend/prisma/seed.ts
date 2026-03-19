/**
 * Database Seed Script
 * Populates the database with initial data
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { 
  permissions,
  roles,
  rolePermissions,
  adCategories,
  productCategories,
  levels,
  achievements,
  systemSettings,
  testUsers,
  testBrands,
  testCampaigns,
  testProducts,
  testRooms
} from './seed-data';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // =====================================================
    // 1. Seed Permissions
    // =====================================================
    console.log('📦 Seeding permissions...');
    for (const permission of permissions) {
      await prisma.permission.upsert({
        where: {
          resource_action: {
            resource: permission.resource,
            action: permission.action,
          },
        },
        update: {},
        create: permission,
      });
    }
    console.log(`✅ Created ${permissions.length} permissions`);

    // =====================================================
    // 2. Seed Roles
    // =====================================================
    console.log('📦 Seeding roles...');
    for (const role of roles) {
      await prisma.role.upsert({
        where: { name: role.name },
        update: {},
        create: role,
      });
    }
    console.log(`✅ Created ${roles.length} roles`);

    // =====================================================
    // 3. Assign Permissions to Roles
    // =====================================================
    console.log('📦 Assigning permissions to roles...');
    
    for (const mapping of rolePermissions) {
      const role = await prisma.role.findUnique({
        where: { name: mapping.roleName },
      });

      if (!role) {
        console.warn(`⚠️ Role ${mapping.roleName} not found`);
        continue;
      }

      // Skip if wildcard (all permissions)
      if (mapping.permissions.includes('*')) {
        const allPermissions = await prisma.permission.findMany();
        for (const permission of allPermissions) {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: role.id,
                permissionId: permission.id,
              },
            },
            update: {},
            create: {
              roleId: role.id,
              permissionId: permission.id,
            },
          });
        }
      } else {
        for (const permString of mapping.permissions) {
          const [resource, action] = permString.split(':');
          const permission = await prisma.permission.findUnique({
            where: {
              resource_action: {
                resource,
                action,
              },
            },
          });

          if (permission) {
            await prisma.rolePermission.upsert({
              where: {
                roleId_permissionId: {
                  roleId: role.id,
                  permissionId: permission.id,
                },
              },
              update: {},
              create: {
                roleId: role.id,
                permissionId: permission.id,
              },
            });
          }
        }
      }
    }
    console.log(`✅ Assigned permissions to roles`);

    // =====================================================
    // 4. Seed Ad Categories
    // =====================================================
    console.log('📦 Seeding ad categories...');
    for (const category of adCategories) {
      await prisma.adCategory.upsert({
        where: { categoryId: category.categoryId },
        update: {},
        create: category,
      });
    }
    console.log(`✅ Created ${adCategories.length} ad categories`);

    // =====================================================
    // 5. Seed Product Categories
    // =====================================================
    console.log('📦 Seeding product categories...');
    for (const category of productCategories) {
      await prisma.productCategory.upsert({
        where: { slug: category.slug },
        update: {},
        create: category,
      });
    }
    console.log(`✅ Created ${productCategories.length} product categories`);

    // =====================================================
    // 6. Seed User Levels
    // =====================================================
    console.log('📦 Seeding user levels...');
    for (const level of levels) {
      await prisma.level.upsert({
        where: { levelNumber: level.levelNumber },
        update: {},
        create: level,
      });
    }
    console.log(`✅ Created ${levels.length} user levels`);

    // =====================================================
    // 7. Seed Achievements
    // =====================================================
    console.log('📦 Seeding achievements...');
    for (const achievement of achievements) {
      await prisma.achievement.upsert({
        where: { code: achievement.code },
        update: {},
        create: achievement,
      });
    }
    console.log(`✅ Created ${achievements.length} achievements`);

    // =====================================================
    // 8. Seed System Settings
    // =====================================================
    console.log('📦 Seeding system settings...');
    for (const setting of systemSettings) {
      await prisma.systemSettings.upsert({
        where: { settingKey: setting.settingKey },
        update: {},
        create: setting,
      });
    }
    console.log(`✅ Created ${systemSettings.length} system settings`);

    // =====================================================
    // 9. Seed Test Users (Development only)
    // =====================================================
    if (process.env.NODE_ENV !== 'production') {
      console.log('📦 Seeding test users...');

      for (const userData of testUsers) {
        // Create user
        const user = await prisma.user.upsert({
          where: { email: userData.email },
          update: {},
          create: {
            username: userData.username,
            email: userData.email,
            phone: userData.phone,
            password: userData.password,
            accountType: userData.accountType as any,
            status: userData.status as any,
            emailVerified: userData.emailVerified,
            phoneVerified: userData.phoneVerified || false,
          },
        });

        // Create profile
        if (userData.profile) {
          await prisma.userProfile.upsert({
            where: { userId: user.id },
            update: {},
            create: {
              userId: user.id,
              firstName: userData.profile.firstName,
              lastName: userData.profile.lastName,
              displayName: userData.profile.displayName,
              bio: userData.profile.bio,
              interests: userData.profile.interests || [],
            },
          });
        }

        // Create preferences
        await prisma.userPreference.upsert({
          where: { userId: user.id },
          update: {},
          create: {
            userId: user.id,
          },
        });

        // Create wallet
        await prisma.capWallet.upsert({
          where: { userId: user.id },
          update: {},
          create: {
            userId: user.id,
            balance: 1000, // Give new users 1000 CAP for testing
            lifetimeEarned: 1000,
            lifetimeSpent: 0,
          },
        });

        // Create statistics
        await prisma.userStatistics.upsert({
          where: { userId: user.id },
          update: {},
          create: {
            userId: user.id,
            totalCapEarned: 1000,
          },
        });

        // Assign default role
        const role = await prisma.role.findUnique({
          where: { name: userData.accountType === 'ADMIN' ? 'ADMIN' : 
                          userData.accountType === 'MODERATOR' ? 'MODERATOR' :
                          userData.accountType === 'SPONSOR' ? 'SPONSOR' : 'USER' },
        });

        if (role) {
          await prisma.userRole.upsert({
            where: {
              userId_roleId: {
                userId: user.id,
                roleId: role.id,
              },
            },
            update: {},
            create: {
              userId: user.id,
              roleId: role.id,
            },
          });
        }

        // Create sponsor record if applicable
        if (userData.sponsor) {
          await prisma.sponsor.upsert({
            where: { id: user.id },
            update: {},
            create: {
              id: user.id,
              companyName: userData.sponsor.companyName,
              registrationNumber: userData.sponsor.registrationNumber,
              taxId: userData.sponsor.taxId,
              businessType: userData.sponsor.businessType,
              businessCategory: userData.sponsor.businessCategory,
              website: userData.sponsor.website,
              verificationStatus: userData.sponsor.verificationStatus as any,
              subscriptionTier: userData.sponsor.subscriptionTier,
              creditLimit: userData.sponsor.creditLimit,
            },
          });
        }
      }
      console.log(`✅ Created ${testUsers.length} test users`);

      // =====================================================
      // 10. Seed Test Brands
      // =====================================================
      console.log('📦 Seeding test brands...');
      for (const brandData of testBrands) {
        // Find sponsor user
        const sponsorUser = testUsers.find(u => u.username === brandData.sponsorUsername);
        if (!sponsorUser) continue;

        const sponsor = await prisma.sponsor.findUnique({
          where: { id: (await prisma.user.findUnique({ where: { email: sponsorUser.email } }))?.id },
        });

        if (sponsor) {
          await prisma.brand.upsert({
            where: { slug: brandData.name.toLowerCase().replace(/\s+/g, '-') },
            update: {},
            create: {
              sponsorId: sponsor.id,
              name: brandData.name,
              slug: brandData.name.toLowerCase().replace(/\s+/g, '-'),
              description: brandData.description,
              industry: brandData.industry,
              isActive: true,
            },
          });
        }
      }
      console.log(`✅ Created ${testBrands.length} test brands`);

      // =====================================================
      // 11. Seed Test Campaigns
      // =====================================================
      console.log('📦 Seeding test campaigns...');
      for (const campaignData of testCampaigns) {
        const brand = await prisma.brand.findFirst({
          where: { name: campaignData.brandName },
        });

        if (brand) {
          await prisma.campaign.create({
            data: {
              brandId: brand.id,
              name: campaignData.name,
              slug: campaignData.name.toLowerCase().replace(/\s+/g, '-'),
              description: campaignData.description,
              objective: campaignData.objective as any,
              status: campaignData.status as any,
              startDate: campaignData.startDate,
              endDate: campaignData.endDate,
              totalBudget: campaignData.totalBudget,
              dailyBudget: campaignData.dailyBudget,
              createdBy: brand.sponsorId,
            },
          });
        }
      }
      console.log(`✅ Created ${testCampaigns.length} test campaigns`);

      // =====================================================
      // 12. Seed Test Products
      // =====================================================
      console.log('📦 Seeding test products...');
      for (const productData of testProducts) {
        const brand = await prisma.brand.findFirst({
          where: { name: productData.brandName },
        });

        const category = await prisma.productCategory.findFirst({
          where: { name: productData.categoryName },
        });

        if (brand && category) {
          await prisma.product.create({
            data: {
              brandId: brand.id,
              categoryId: category.id,
              name: productData.name,
              slug: productData.name.toLowerCase().replace(/\s+/g, '-'),
              description: productData.description,
              priceFiat: productData.priceFiat,
              priceCap: productData.priceCap,
              stockQuantity: productData.stockQuantity,
              sku: productData.sku,
              status: 'ACTIVE',
            },
          });
        }
      }
      console.log(`✅ Created ${testProducts.length} test products`);

      // =====================================================
      // 13. Seed Test Rooms
      // =====================================================
      console.log('📦 Seeding test rooms...');
      for (const roomData of testRooms) {
        const brand = await prisma.brand.findFirst({
          where: { name: roomData.brandName },
        });

        if (brand) {
          const room = await prisma.room.create({
            data: {
              brandId: brand.id,
              name: roomData.name,
              slug: roomData.name.toLowerCase().replace(/\s+/g, '-'),
              description: roomData.description,
              roomType: roomData.roomType as any,
              status: roomData.status as any,
              visibility: roomData.visibility as any,
              maxParticipants: roomData.maxParticipants,
              scheduledStart: roomData.scheduledStart,
              scheduledEnd: roomData.scheduledEnd,
              createdBy: brand.sponsorId,
            },
          });

          // Add host
          await prisma.roomHost.create({
            data: {
              roomId: room.id,
              userId: brand.sponsorId,
              role: 'host',
            },
          });
        }
      }
      console.log(`✅ Created ${testRooms.length} test rooms`);

      // =====================================================
      // 14. Seed Sample Engagement Data
      // =====================================================
      console.log('📦 Seeding sample engagement data...');
      
      const users = await prisma.user.findMany({
        where: { accountType: 'USER' },
        take: 5,
      });

      const products = await prisma.product.findMany({ take: 3 });
      const campaigns = await prisma.campaign.findMany({ take: 2 });
      const rooms = await prisma.room.findMany({ take: 2 });

      for (const user of users) {
        // Add some likes
        for (const product of products) {
          await prisma.like.upsert({
            where: {
              userId_targetType_targetId: {
                userId: user.id,
                targetType: 'product',
                targetId: product.id,
              },
            },
            update: {},
            create: {
              userId: user.id,
              targetType: 'product',
              targetId: product.id,
            },
          });
        }

        // Add some comments
        if (products[0]) {
          await prisma.comment.create({
            data: {
              userId: user.id,
              targetType: 'product',
              targetId: products[0].id,
              content: `Great product! I've been looking for something like this.`,
            },
          });
        }

        // Join some rooms
        for (const room of rooms) {
          await prisma.roomParticipant.create({
            data: {
              roomId: room.id,
              userId: user.id,
              role: 'viewer',
              isActive: true,
            },
          });
        }

        // Add some CAP earnings
        const wallet = await prisma.capWallet.findUnique({
          where: { userId: user.id },
        });

        if (wallet) {
          await prisma.capTransaction.create({
            data: {
              walletId: wallet.id,
              type: 'EARN',
              amount: 50,
              balanceBefore: wallet.balance,
              balanceAfter: wallet.balance + 50,
              description: 'Watched ad',
              status: 'COMPLETED',
            },
          });

          await prisma.capWallet.update({
            where: { id: wallet.id },
            data: {
              balance: wallet.balance + 50,
              lifetimeEarned: wallet.lifetimeEarned + 50,
            },
          });
        }
      }
      console.log(`✅ Created sample engagement data`);
    }

    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });