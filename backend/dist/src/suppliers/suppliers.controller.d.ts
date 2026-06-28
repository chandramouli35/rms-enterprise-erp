import { SuppliersService } from './suppliers.service';
export declare class SuppliersController {
    private readonly suppliersService;
    constructor(suppliersService: SuppliersService);
    private getPlantId;
    findAll(req: any, page?: string, limit?: string, search?: string): Promise<{
        data: {
            id: string;
            name: string;
            code: string;
            phone: string | null;
            email: string | null;
            address: string | null;
            gstNumber: string | null;
            plantId: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    create(data: any, req: any): Promise<{
        id: string;
        name: string;
        code: string;
        phone: string | null;
        email: string | null;
        address: string | null;
        gstNumber: string | null;
        plantId: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    update(id: string, data: any, req: any): Promise<{
        id: string;
        name: string;
        code: string;
        phone: string | null;
        email: string | null;
        address: string | null;
        gstNumber: string | null;
        plantId: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    remove(id: string, req: any): Promise<{
        id: string;
        name: string;
        code: string;
        phone: string | null;
        email: string | null;
        address: string | null;
        gstNumber: string | null;
        plantId: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
}
