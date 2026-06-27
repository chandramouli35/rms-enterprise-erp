import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(plantId: string) {
    return this.prisma.supplier.findMany({
      where: { plantId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async create(plantId: string, data: any) {
    return this.prisma.supplier.create({
      data: {
        ...data,
        plantId,
      },
    });
  }

  async update(plantId: string, id: string, data: any) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, plantId, deletedAt: null },
    });

    if (!supplier) throw new NotFoundException('Supplier not found');

    return this.prisma.supplier.update({
      where: { id },
      data,
    });
  }

  async remove(plantId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, plantId, deletedAt: null },
    });

    if (!supplier) throw new NotFoundException('Supplier not found');

    return this.prisma.supplier.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
