import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.plant.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async create(data: any) {
    return this.prisma.plant.create({
      data: {
        name: data.name,
        code: data.code,
        location: data.location,
        standardBagWeight: data.standardBagWeight ? parseFloat(data.standardBagWeight) : 0.382
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.plant.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.code && { code: data.code }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.standardBagWeight !== undefined && { standardBagWeight: parseFloat(data.standardBagWeight) }),
      }
    });
  }
}
