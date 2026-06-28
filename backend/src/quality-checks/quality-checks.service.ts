import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QualityChecksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(plantId: string, inspectorId: string, data: any) {
    // Validate that the gate pass exists, belongs to the plant, and is in GROSS_WEIGHED state
    // Actually, in many workflows QC can happen before gross weigh or after. 
    // We'll just verify the pass exists.
    const gatePass = await this.prisma.gatePass.findFirst({
      where: { id: data.gatePassId, plantId, deletedAt: null }
    });

    if (!gatePass) {
      throw new NotFoundException('Gate Pass not found');
    }

    if (gatePass.status !== 'GROSS_WEIGHED') {
      throw new BadRequestException('Vehicle must complete Gross Weighing before Quality Check');
    }

    // Check if QC already exists
    const existingQc = await this.prisma.qualityCheck.findUnique({
      where: { gatePassId: data.gatePassId }
    });

    if (existingQc) {
      throw new BadRequestException('Quality Check already performed for this Gate Pass');
    }

    const m = parseFloat(data.moisturePercentage);
    const b = parseFloat(data.brokenGrainsPercentage);
    
    let status = 'APPROVED';
    let deduction = 0;

    // Hard rejection rules
    if (m > 18.0 || b > 10.0) {
      status = 'REJECTED';
    } 
    // Deduction rules
    else if (m > 14.0 || b > 5.0) {
      status = 'ACCEPTED_WITH_DEDUCTION';
      // Basic math for deduction (e.g. 50 Rs per MT per % above 14)
      if (m > 14.0) deduction += (m - 14.0) * 50;
      if (b > 5.0) deduction += (b - 5.0) * 30;
    }

    const qc = await this.prisma.qualityCheck.create({
      data: {
        gatePassId: data.gatePassId,
        moisturePercentage: m,
        discolorationPercentage: parseFloat(data.discolorationPercentage),
        brokenGrainsPercentage: b,
        foreignMatterPercentage: parseFloat(data.foreignMatterPercentage),
        status,
        priceDeductionPerMT: deduction,
        inspectorId,
      }
    });

    // Update GatePass status if it's not rejected
    if (status === 'REJECTED') {
      await this.prisma.gatePass.update({
        where: { id: data.gatePassId },
        data: { status: 'REJECTED' }
      });
    } else {
      await this.prisma.gatePass.update({
        where: { id: data.gatePassId },
        data: { status: 'QC_PASSED' }
      });
    }

    return qc;
  }
}
