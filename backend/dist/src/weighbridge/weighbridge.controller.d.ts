import { WeighbridgeService } from './weighbridge.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class WeighbridgeController {
    private readonly weighbridgeService;
    private readonly prisma;
    constructor(weighbridgeService: WeighbridgeService, prisma: PrismaService);
    private getPlantId;
    captureWeight(data: any, req: any): Promise<{
        success: boolean;
    }>;
    getActiveQueue(req: any): Promise<({
        supplier: {
            plantId: string;
            id: string;
            email: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            name: string;
            code: string;
            phone: string | null;
            address: string | null;
            gstNumber: string | null;
        } | null;
    } & {
        plantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        passNumber: string;
        vehicleNumber: string;
        driverName: string | null;
        driverLicense: string | null;
        source: string;
        supplierId: string | null;
        estimatedBags: number | null;
        status: string;
        createdByUserId: string;
    })[]>;
}
