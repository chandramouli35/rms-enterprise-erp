import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page?: string, limit?: string) {
    if (page) {
      const pageNum = parseInt(page || '1', 10);
      const limitNum = parseInt(limit || '10', 10);
      const skip = (pageNum - 1) * limitNum;
      
      const [total, data] = await this.prisma.$transaction([
        this.prisma.plant.count(),
        this.prisma.plant.findMany({
          orderBy: { name: 'asc' },
          skip,
          take: limitNum
        })
      ]);
      return { data, total };
    }

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
        standardBagWeight: data.standardBagWeight ? parseFloat(data.standardBagWeight) : 0.382,
        aClassBagWeight: data.aClassBagWeight ? parseFloat(data.aClassBagWeight) : 0.380,
        bClassBagWeight: data.bClassBagWeight ? parseFloat(data.bClassBagWeight) : 0.385
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.plant.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.code && { code: data.code }),
        ...(data.location && { location: data.location }),
        ...(data.standardBagWeight && { standardBagWeight: parseFloat(data.standardBagWeight) }),
        ...(data.aClassBagWeight && { aClassBagWeight: parseFloat(data.aClassBagWeight) }),
        ...(data.bClassBagWeight && { bClassBagWeight: parseFloat(data.bClassBagWeight) }),
      },
    });
  }

  async remove(id: string) {
    return this.prisma.plant.delete({
      where: { id }
    });
  }
}
