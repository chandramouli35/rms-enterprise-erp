import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    try {
      return await this.prisma.product.create({
        data: createProductDto as any
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('A product with this name already exists.');
      }
      throw error;
    }
  }

  async findAll(page?: string, limit?: string) {
    if (page) {
      const pageNum = parseInt(page || '1', 10);
      const limitNum = parseInt(limit || '10', 10);
      const skip = (pageNum - 1) * limitNum;
      
      const [total, data] = await this.prisma.$transaction([
        this.prisma.product.count(),
        this.prisma.product.findMany({
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum
        })
      ]);
      return { data, total };
    }

    return this.prisma.product.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    return this.prisma.product.update({
      where: { id },
      data: updateProductDto as any
    });
  }

  async remove(id: string) {
    return this.prisma.product.delete({ where: { id } });
  }
}
