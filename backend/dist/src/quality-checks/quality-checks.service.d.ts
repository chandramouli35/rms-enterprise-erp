import { PrismaService } from '../prisma/prisma.service';
export declare class QualityChecksService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(plantId: string, inspectorId: string, data: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        gatePassId: string;
        status: string;
        moisturePercentage: number;
        discolorationPercentage: number;
        brokenGrainsPercentage: number;
        foreignMatterPercentage: number;
        priceDeductionPerMT: number;
        inspectorId: string;
    }>;
}
