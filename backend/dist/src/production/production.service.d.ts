import { PrismaService } from '../prisma/prisma.service';
import { CreateBatchDto } from './dto/create-batch.dto';
export declare class ProductionService {
    private prisma;
    constructor(prisma: PrismaService);
    getMetrics(plantId: string): Promise<{
        batchesToday: number;
        totalPaddyUsed: number;
        totalRiceProduced: number;
        avgYield: string;
        totalProcessLoss: number;
        totalByProducts: number;
    }>;
    getBatches(plantId: string): Promise<({
        processLoss: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            productionBatchId: string;
            totalLoss: number;
            cleaningLoss: number;
            dryingLoss: number;
            huskingLoss: number;
            polishingLoss: number;
            brokenLoss: number;
        } | null;
        yieldReport: {
            plantId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            productionBatchId: string;
            headRicePercent: number;
            brokenRicePercent: number;
            branPercent: number;
            huskPercent: number;
            lossPercent: number;
            overallRecovery: number;
            yieldTarget: number | null;
            targetAchieved: boolean;
        } | null;
        byProducts: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            quantity: number;
            remarks: string | null;
            productionBatchId: string;
            unit: string;
            utilization: string | null;
        }[];
    } & {
        plantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        riceProducedQty: number | null;
        paddyUsedQty: number;
        progress: number;
        remarks: string | null;
        shift: string;
        batchNo: string;
        date: Date;
        productionLine: string;
        paddyType: string;
        variety: string;
        paddySource: string | null;
        status: string;
        startTime: Date | null;
        endTime: Date | null;
    })[]>;
    createBatch(dto: CreateBatchDto): Promise<{
        plantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        riceProducedQty: number | null;
        paddyUsedQty: number;
        progress: number;
        remarks: string | null;
        shift: string;
        batchNo: string;
        date: Date;
        productionLine: string;
        paddyType: string;
        variety: string;
        paddySource: string | null;
        status: string;
        startTime: Date | null;
        endTime: Date | null;
    }>;
}
