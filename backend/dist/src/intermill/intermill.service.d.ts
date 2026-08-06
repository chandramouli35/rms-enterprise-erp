import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
export declare class IntermillService {
    private readonly prisma;
    private readonly inventoryService;
    constructor(prisma: PrismaService, inventoryService: InventoryService);
    create(createDto: any, user: any): Promise<{
        outputs: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            outputBags: number;
            productId: string;
            batchId: string;
        }[];
    } & {
        id: string;
        batchNo: string;
        shift: string;
        date: Date;
        startTime: string;
        endTime: string;
        inputBags: number;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        supervisorId: string;
        rawMaterialId: string;
        plantId: string;
    }>;
    findAll(user: any): Promise<({
        supervisor: {
            username: string;
        };
        rawMaterial: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            type: string;
            description: string | null;
        };
        outputs: ({
            product: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                type: string;
                description: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            outputBags: number;
            productId: string;
            batchId: string;
        })[];
    } & {
        id: string;
        batchNo: string;
        shift: string;
        date: Date;
        startTime: string;
        endTime: string;
        inputBags: number;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        supervisorId: string;
        rawMaterialId: string;
        plantId: string;
    })[]>;
    approve(id: string, user: any): Promise<{
        id: string;
        batchNo: string;
        shift: string;
        date: Date;
        startTime: string;
        endTime: string;
        inputBags: number;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        supervisorId: string;
        rawMaterialId: string;
        plantId: string;
    }>;
    private processInventoryUpdate;
    private updateStock;
}
