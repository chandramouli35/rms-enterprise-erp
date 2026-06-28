import { ProductionService } from './production.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { CreateProductionLogDto } from './dto/create-production-log.dto';
import { CreateProcessLossDto } from './dto/create-process-loss.dto';
export declare class ProductionController {
    private readonly productionService;
    constructor(productionService: ProductionService);
    createBatch(dto: CreateBatchDto): Promise<{
        plantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.MillingStatus;
        batchNumber: string;
        rawMaterialQty: number;
    }>;
    startMilling(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.MillingStatus;
        startTime: Date | null;
        endTime: Date | null;
        batchId: string;
    }>;
    stopMilling(id: string): Promise<{
        plantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.MillingStatus;
        batchNumber: string;
        rawMaterialQty: number;
    }>;
    addProductionLog(id: string, dto: CreateProductionLogDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        itemType: string;
        quantity: number;
        shift: string | null;
        millingProcessId: string;
    }>;
    addProcessLoss(id: string, dto: CreateProcessLossDto): Promise<{
        id: string;
        createdAt: Date;
        quantity: number;
        lossType: import(".prisma/client").$Enums.LossType;
        millingProcessId: string;
    }>;
    getBatchYield(id: string): Promise<{
        batchNumber: string;
        rawMaterialQty: number;
        totalProduced: number;
        totalLoss: number;
        yieldPercentage: number;
        lossPercentage: number;
        productionLogs: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            itemType: string;
            quantity: number;
            shift: string | null;
            millingProcessId: string;
        }[];
        processLosses: {
            id: string;
            createdAt: Date;
            quantity: number;
            lossType: import(".prisma/client").$Enums.LossType;
            millingProcessId: string;
        }[];
    }>;
    findAllBatches(plantId: string): Promise<({
        millingProcess: ({
            productionLogs: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                itemType: string;
                quantity: number;
                shift: string | null;
                millingProcessId: string;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.MillingStatus;
            startTime: Date | null;
            endTime: Date | null;
            batchId: string;
        }) | null;
    } & {
        plantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.MillingStatus;
        batchNumber: string;
        rawMaterialQty: number;
    })[]>;
    getPlantYieldAnalytics(plantId: string): Promise<{
        yieldData: {
            name: string;
            raw: number;
            produced: number;
            yield: number;
        }[];
        lossData: {
            name: string;
            value: number;
        }[];
    }>;
}
