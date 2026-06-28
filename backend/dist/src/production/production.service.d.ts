import { PrismaService } from '../prisma/prisma.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { CreateProductionLogDto } from './dto/create-production-log.dto';
import { CreateProcessLossDto } from './dto/create-process-loss.dto';
import { InventoryService } from '../inventory/inventory.service';
export declare class ProductionService {
    private readonly prisma;
    private readonly inventoryService;
    constructor(prisma: PrismaService, inventoryService: InventoryService);
    createBatch(dto: CreateBatchDto): Promise<{
        plantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.MillingStatus;
        batchNumber: string;
        rawMaterialQty: number;
    }>;
    startMilling(batchId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.MillingStatus;
        startTime: Date | null;
        endTime: Date | null;
        batchId: string;
    }>;
    stopMilling(batchId: string): Promise<{
        plantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.MillingStatus;
        batchNumber: string;
        rawMaterialQty: number;
    }>;
    addProductionLog(millingProcessId: string, dto: CreateProductionLogDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        itemType: string;
        quantity: number;
        shift: string | null;
        millingProcessId: string;
    }>;
    addProcessLoss(millingProcessId: string, dto: CreateProcessLossDto): Promise<{
        id: string;
        createdAt: Date;
        quantity: number;
        lossType: import(".prisma/client").$Enums.LossType;
        millingProcessId: string;
    }>;
    getBatchYield(batchId: string): Promise<{
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
