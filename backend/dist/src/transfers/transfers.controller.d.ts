import { TransfersService, CreateTransferDto } from './transfers.service';
import { ItemCategory } from '@prisma/client';
export declare class TransfersController {
    private readonly transfersService;
    constructor(transfersService: TransfersService);
    initiateTransfer(dto: CreateTransferDto, req: any): Promise<{
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
    receiveTransfer(id: string, itemCategory: ItemCategory, req: any): Promise<{
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
