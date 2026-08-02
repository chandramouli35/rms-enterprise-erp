import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(plantId: string) {
    // Only return users who have access to this plant
    const users = await this.prisma.user.findMany({
      where: {
        plantAccess: {
          some: { plantId }
        }
      },
      include: {
        role: true,
        plantAccess: {
          include: { plant: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role.name,
      plants: user.plantAccess.map(pa => pa.plant.name)
    }));
  }

  async create(data: any, reqUser: any) {
    // Basic validation could go here
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const role = await this.prisma.role.findUnique({ where: { name: data.role } });
    if (!role) {
      throw new ConflictException('Role not found');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        passwordHash,
        roleId: role.id,
        plantAccess: {
          create: data.plantIds.map((id: string) => ({
            plantId: id
          }))
        }
      },
      include: {
        role: true,
        plantAccess: { include: { plant: true } }
      }
    });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role.name,
    };
  }

  async grantOverride(plantId: string, targetUserId: string, permissionType: string, grantedBy: string) {
    // 8-hour auto-cutoff logic
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 8);

    return this.prisma.permissionOverride.create({
      data: {
        plantId,
        userId: targetUserId,
        permissionType,
        grantedBy,
        expiresAt,
        isActive: true,
      }
    });
  }

  async getActiveOverrides(plantId: string, userId: string) {
    const now = new Date();
    return this.prisma.permissionOverride.findMany({
      where: {
        plantId,
        userId,
        isActive: true,
        expiresAt: {
          gt: now, // Must not be expired
        }
      }
    });
  }
}
