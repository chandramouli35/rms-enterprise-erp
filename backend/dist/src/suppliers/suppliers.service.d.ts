import { PrismaService } from '../prisma/prisma.service';
export declare class SuppliersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(plantId: string, page?: number, limit?: number, search?: string): Promise<{
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
    create(plantId: string, data: any): Promise<{
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
    update(plantId: string, id: string, data: any): Promise<{
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
    remove(plantId: string, id: string): Promise<{
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
