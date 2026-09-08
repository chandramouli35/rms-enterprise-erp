import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, CreateQuantityUnitDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const DEFAULT_UNITS = [
  { code: 'NOS', label: 'Nos', description: 'Number', isSystem: true },
  { code: 'BAGS', label: 'Bags', description: 'Bags', isSystem: true },
  { code: 'KG', label: 'Kg', description: 'Kilogram', isSystem: true },
  { code: 'QTL', label: 'Qtl', description: 'Quintal', isSystem: true },
  { code: 'LTR', label: 'Ltr', description: 'Liter', isSystem: true },
];

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureDefaultUnits() {
    for (const unit of DEFAULT_UNITS) {
      await this.prisma.quantityUnit.upsert({
        where: { code: unit.code },
        update: {},
        create: unit,
      });
    }
  }

  private async resolveQuantityFormat(code?: string) {
    await this.ensureDefaultUnits();
    const normalized = (code || 'QTL').trim().toUpperCase();
    const unit = await this.prisma.quantityUnit.findUnique({ where: { code: normalized } });
    if (!unit) {
      throw new BadRequestException(`Invalid quantity format "${code}". Please select a valid unit.`);
    }
    return normalized;
  }

  private async syncInventoryUnits(productId: string, productName: string, unitCode: string) {
    await this.prisma.inventory.updateMany({
      where: {
        OR: [
          { productId },
          { variety: productName, itemType: 'CONSUMABLES' },
        ],
      },
      data: { unit: unitCode, productId },
    });
  }

  async create(createProductDto: CreateProductDto) {
    const quantityFormat = await this.resolveQuantityFormat(createProductDto.quantityFormat);

    try {
      return await this.prisma.product.create({
        data: {
          name: createProductDto.name.trim(),
          category: createProductDto.category || 'OPERATIONAL',
          description: createProductDto.description,
          quantityFormat,
          type: 'GENERAL',
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('A product with this name already exists.');
      }
      throw error;
    }
  }

  async findAll(page?: string, limit?: string) {
    await this.ensureDefaultUnits();

    if (page) {
      const pageNum = parseInt(page || '1', 10);
      const limitNum = parseInt(limit || '10', 10);
      const skip = (pageNum - 1) * limitNum;

      const [total, data] = await this.prisma.$transaction([
        this.prisma.product.count(),
        this.prisma.product.findMany({
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
      ]);
      return { data, total };
    }

    return this.prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findForSelection(plantId?: string) {
    await this.ensureDefaultUnits();
    const products = await this.prisma.product.findMany({
      where: { category: 'OPERATIONAL' },
      orderBy: { name: 'asc' },
    });

    if (!plantId) {
      return products.map((product) => ({ ...product, availableStock: null }));
    }

    const inventories = await this.prisma.inventory.findMany({
      where: { plantId },
      select: { productId: true, variety: true, quantity: true, unit: true },
    });

    return products.map((product) => {
      const match = inventories.find(
        (inv) => inv.productId === product.id || inv.variety === product.name,
      );
      return {
        ...product,
        availableStock: match?.quantity ?? 0,
        inventoryUnit: match?.unit || product.quantityFormat,
      };
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const existing = await this.findOne(id);
    const data: any = {};

    if (updateProductDto.name !== undefined) data.name = updateProductDto.name.trim();
    if (updateProductDto.category !== undefined) data.category = updateProductDto.category;
    if (updateProductDto.description !== undefined) data.description = updateProductDto.description;

    if (updateProductDto.quantityFormat !== undefined) {
      data.quantityFormat = await this.resolveQuantityFormat(updateProductDto.quantityFormat);
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data,
    });

    if (data.quantityFormat) {
      await this.syncInventoryUnits(updated.id, updated.name, updated.quantityFormat);
    } else if (data.name) {
      await this.syncInventoryUnits(updated.id, updated.name, updated.quantityFormat);
    }

    return updated;
  }

  async remove(id: string) {
    return this.prisma.product.delete({ where: { id } });
  }

  async listUnits() {
    await this.ensureDefaultUnits();
    return this.prisma.quantityUnit.findMany({ orderBy: [{ isSystem: 'desc' }, { label: 'asc' }] });
  }

  async createUnit(dto: CreateQuantityUnitDto) {
    const code = dto.code.trim().toUpperCase().replace(/\s+/g, '_');
    const label = dto.label.trim();

    if (!code || !label) {
      throw new BadRequestException('Unit code and label are required.');
    }

    try {
      return await this.prisma.quantityUnit.create({
        data: {
          code,
          label,
          description: dto.description?.trim() || null,
          isSystem: false,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('A unit with this code already exists.');
      }
      throw error;
    }
  }
}
