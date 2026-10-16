import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { WastageRecordService } from '../production/wastage-record.service';

@Injectable()
export class IntermillService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly wastageRecord: WastageRecordService,
  ) {}

  async create(createDto: any, user: any) {
    const { batchNo, shift, date, startTime, endTime, rawMaterialId, inputBags, outputs, plantId } = createDto;
    const safaiDustBags = this.wastageRecord.wholeBags(createDto.safaiDustBags, 'Safai Dust');
    const patalBags = this.wastageRecord.wholeBags(createDto.patalBags, 'Patal');

    // Wastage includes Safai Dust and Patal so they are not left as unexplained loss.
    let totalOutputBags = safaiDustBags + patalBags;
    for (const out of outputs || []) {
      totalOutputBags += Number(out.outputBags);
    }
    
    const wastage = Number(inputBags) - totalOutputBags;
    const lossPercentage = Number(inputBags) > 0 ? (wastage / Number(inputBags)) * 100 : 0;
    
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
        safaiDustBags,
        patalBags,
        plantId,
        outputs: {
          create: (outputs || []).map((out: any) => ({
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
      await this.postWastage(batch.id);
    } else if (safaiDustBags || patalBags) {
      const plant = await this.prisma.plant.findUnique({
        where: { id: plantId },
        select: { wastageBagWeight: true, standardBagWeight: true },
      });
      await this.wastageRecord.notifyIfOverShiftLimit({
        plantId,
        shift,
        date,
        bagWeightQtl: this.wastageRecord.bagWeightQtl(plant),
      });
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
    await this.postWastage(batch.id);

    return updatedBatch;
  }

  private async postWastage(batchId: string) {
    const batch = await this.prisma.intermillBatch.findUnique({ where: { id: batchId } });
    if (!batch) return;
    const safaiDustBags = Number(batch.safaiDustBags || 0);
    const patalBags = Number(batch.patalBags || 0);
    if (!safaiDustBags && !patalBags) return;
    const plant = await this.prisma.plant.findUnique({
      where: { id: batch.plantId },
      select: { wastageBagWeight: true, standardBagWeight: true },
    });
    const bagWeightQtl = this.wastageRecord.bagWeightQtl(plant);
    await this.wastageRecord.addToStock({
      plantId: batch.plantId,
      shift: batch.shift,
      safaiDustBags,
      patalBags,
      referenceId: batch.id,
      bagWeightQtl,
    });
    await this.wastageRecord.notifyIfOverShiftLimit({
      plantId: batch.plantId,
      shift: batch.shift,
      date: batch.date,
      bagWeightQtl,
    });
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
