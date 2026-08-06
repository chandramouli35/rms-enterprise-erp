import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class IntermillService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  async create(createDto: any, user: any) {
    const { batchNo, shift, date, startTime, endTime, rawMaterialId, inputBags, outputs, plantId } = createDto;

    // Calculate wastage
    let totalOutputBags = 0;
    for (const out of outputs) {
      totalOutputBags += Number(out.outputBags);
    }
    
    const wastage = Number(inputBags) - totalOutputBags;
    const lossPercentage = (wastage / Number(inputBags)) * 100;
    
    let status = 'COMPLETED';
    if (lossPercentage > 2) {
      status = 'PENDING_APPROVAL';
    }

    const batch = await this.prisma.intermillBatch.create({
      data: {
        batchNo,
        shift,
        supervisorId: user.userId,
        date: new Date(date),
        startTime,
        endTime,
        rawMaterialId,
        inputBags: Number(inputBags),
        status,
        plantId,
        outputs: {
          create: outputs.map((out: any) => ({
            productId: out.productId,
            outputBags: Number(out.outputBags),
          })),
        },
      },
      include: {
        outputs: true,
      },
    });

    if (status === 'COMPLETED') {
      await this.processInventoryUpdate(batch.id);
    }

    return batch;
  }

  async findAll(user: any) {
    // If admin, show all, otherwise show only plant specific
    let whereClause = {};
    if (user.role !== 'Admin') {
      whereClause = {
        plantId: user.plantId
      };
    }
    
    return this.prisma.intermillBatch.findMany({
      where: whereClause,
      include: {
        rawMaterial: true,
        supervisor: {
          select: { username: true }
        },
        outputs: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(id: string, user: any) {
    if (user.role !== 'Admin') {
      throw new BadRequestException('Only Admin can approve intermill batches');
    }

    const batch = await this.prisma.intermillBatch.findUnique({
      where: { id },
      include: { outputs: true }
    });

    if (!batch) {
      throw new BadRequestException('Batch not found');
    }

    if (batch.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Batch is not pending approval');
    }

    const updatedBatch = await this.prisma.intermillBatch.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });

    await this.processInventoryUpdate(batch.id);

    return updatedBatch;
  }

  private async processInventoryUpdate(batchId: string) {
    const batch = await this.prisma.intermillBatch.findUnique({
      where: { id: batchId },
      include: { outputs: true }
    });

    if (!batch) return;

    // TODO: Update stock when product/inventory mapping is defined.
    // await this.updateStock(batch.plantId, batch.rawMaterialId, -batch.inputBags);
    // for (const out of batch.outputs) {
    //   await this.updateStock(batch.plantId, out.productId, out.outputBags);
    // }
  }
  
  private async updateStock(plantId: string, productId: string, bagDiff: number) {
     // TODO: Implement inventory stock update once Inventory model supports products
  }
}
