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
        createdAt: Date;
        updatedAt: Date;
        batchNo: string;
        date: Date;
        shift: string;
        status: string;
        startTime: string;
        endTime: string;
        plantId: string;
        inputBags: number;
        supervisorId: string;
        rawMaterialId: string;
    }>;
    findAll(user: any): Promise<({
        supervisor: {
            username: string;
        };
        rawMaterial: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            category: string;
            type: string;
        };
        outputs: ({
            product: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                category: string;
                type: string;
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
        createdAt: Date;
        updatedAt: Date;
        batchNo: string;
        date: Date;
        shift: string;
        status: string;
        startTime: string;
        endTime: string;
        plantId: string;
        inputBags: number;
        supervisorId: string;
        rawMaterialId: string;
    })[]>;
    approve(id: string, user: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        batchNo: string;
        date: Date;
        shift: string;
        status: string;
        startTime: string;
        endTime: string;
        plantId: string;
        inputBags: number;
        supervisorId: string;
        rawMaterialId: string;
    }>;
    private processInventoryUpdate;
    private updateStock;
}
