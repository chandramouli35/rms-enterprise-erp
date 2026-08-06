import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { CreateMandiDto } from './dto/create-mandi.dto';
import { UpdateMandiDto } from './dto/update-mandi.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MandisService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createMandiDto: CreateMandiDto) {
    const existingMandi = await this.prisma.mandi.findUnique({
      where: { name: createMandiDto.name }
    });

    if (existingMandi) {
      throw new ConflictException('Mandi with this name already exists');
    }

    return this.prisma.mandi.create({
      data: {
        name: createMandiDto.name,
        isActive: createMandiDto.isActive ?? true,
      }
    });
  }

  findAll() {
    return this.prisma.mandi.findMany({
      orderBy: { name: 'asc' }
    });
  }

  async findOne(id: string) {
    const mandi = await this.prisma.mandi.findUnique({
      where: { id }
    });

    if (!mandi) {
      throw new NotFoundException('Mandi not found');
    }

    return mandi;
  }

  async update(id: string, updateMandiDto: UpdateMandiDto) {
    await this.findOne(id); // Ensure exists

    if (updateMandiDto.name) {
      const existingMandi = await this.prisma.mandi.findFirst({
        where: { name: updateMandiDto.name, NOT: { id } }
      });
      if (existingMandi) {
        throw new ConflictException('Mandi with this name already exists');
      }
    }

    return this.prisma.mandi.update({
      where: { id },
      data: updateMandiDto
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.mandi.delete({
      where: { id }
    });
  }
}
