import { SuppliersService } from './suppliers.service';
export declare class SuppliersController {
    private readonly suppliersService;
    constructor(suppliersService: SuppliersService);
    private getPlantId;
    findAll(req: any): Promise<{
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
    }[]>;
    create(data: any, req: any): Promise<{
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
    }>;
    update(id: string, data: any, req: any): Promise<{
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
    }>;
    remove(id: string, req: any): Promise<{
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
    }>;
}
