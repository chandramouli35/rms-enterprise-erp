import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(plantId: string, page: number = 1, limit: number = 10, search?: string, role?: string) {
    const skip = (page - 1) * limit;

    const where: any = {
      plantAccess: {
        some: { plantId }
      }
    };

    if (search) {
      where.username = { contains: search, mode: 'insensitive' };
    }

    if (role && role !== 'ALL') {
      where.role = { name: role };
    }

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          role: true,
          plantAccess: {
            include: { plant: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      data: users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role.name,
        plants: user.plantAccess.map(pa => pa.plant.name)
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
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
}
