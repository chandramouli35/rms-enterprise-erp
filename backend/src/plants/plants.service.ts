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
      },
    });
  }
}
