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
            batchId: string;
            outputBags: number;
            productId: string;
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
        rawMaterialId: string;
        inputBags: number;
        supervisorId: string;
    }>;
    findAll(user: any): Promise<({
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
            batchId: string;
            outputBags: number;
            productId: string;
        })[];
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
        rawMaterialId: string;
        inputBags: number;
        supervisorId: string;
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
        rawMaterialId: string;
        inputBags: number;
        supervisorId: string;
    }>;
    private processInventoryUpdate;
    private updateStock;
}
