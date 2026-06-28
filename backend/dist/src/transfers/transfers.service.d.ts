import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { ItemCategory } from '@prisma/client';
export declare class CreateTransferDto {
    sourcePlantId: string;
    targetPlantId: string;
    itemType: string;
    itemCategory: ItemCategory;
    quantity: number;
}
export declare class TransfersService {
    private readonly prisma;
    private readonly inventoryService;
    constructor(prisma: PrismaService, inventoryService: InventoryService);
    initiateTransfer(dto: CreateTransferDto, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        itemType: string;
        quantity: number;
        status: import(".prisma/client").$Enums.TransferStatus;
        initiatedBy: string;
        receivedBy: string | null;
        sourcePlantId: string;
        targetPlantId: string;
    }>;
    receiveTransfer(transferId: string, userId: string, itemCategory: ItemCategory): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        itemType: string;
        quantity: number;
        status: import(".prisma/client").$Enums.TransferStatus;
        initiatedBy: string;
        receivedBy: string | null;
        sourcePlantId: string;
        targetPlantId: string;
    }>;
    getTransfersForPlant(plantId: string): Promise<({
        sourcePlant: {
            id: string;
            name: string;
            code: string;
        };
        targetPlant: {
            id: string;
            name: string;
            code: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        itemType: string;
        quantity: number;
        status: import(".prisma/client").$Enums.TransferStatus;
        initiatedBy: string;
        receivedBy: string | null;
        sourcePlantId: string;
        targetPlantId: string;
    })[]>;
}
