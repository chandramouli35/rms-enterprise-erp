import { PrismaService } from '../prisma/prisma.service';
export declare class YieldService {
    private prisma;
    constructor(prisma: PrismaService);
    saveCalculatorData(plantId: string, data: any): Promise<{
        success: boolean;
        data: any;
    }>;
    getAnalytics(plantId: string): Promise<{
        bestPlant: string;
        highestYield: number;
        lowestYield: number;
        averageYield: number;
        predictedYield: number;
        latestBatch: null;
        batchStart: null;
        batchEnd: null;
        batchPaddy: number;
        batchRice: number;
        batchByProducts: number;
        batchLoss: number;
        batchRecovery: number;
        batchTarget: number;
        batchAchievement: number;
        chartData: never[];
    } | {
        bestPlant: string;
        highestYield: string;
        lowestYield: string;
        averageYield: string;
        predictedYield: string;
        latestBatch: string;
        batchStart: string;
        batchEnd: string;
        batchPaddy: string;
        batchRice: string;
        batchByProducts: string;
        batchLoss: string;
        batchRecovery: string;
        batchTarget: string;
        batchAchievement: string;
        chartData: {
            name: string;
            yield: number;
            date: Date;
        }[];
    }>;
    getHistorical(plantId: string, dateFrom?: string, dateTo?: string, variety?: string): Promise<({
        batch: {
            plantId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            riceProducedQty: number | null;
            paddyUsedQty: number;
            progress: number;
            shift: string;
            remarks: string | null;
            batchNo: string;
            date: Date;
            productionLine: string;
            paddyType: string;
            variety: string;
            paddySource: string | null;
            status: string;
            startTime: Date | null;
            endTime: Date | null;
        };
    } & {
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
    })[]>;
}
