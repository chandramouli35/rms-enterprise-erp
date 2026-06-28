import { PrismaService } from '../prisma/prisma.service';
export declare class SuppliersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(plantId: string, page?: number, limit?: number, search?: string): Promise<{
        data: {
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
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    create(plantId: string, data: any): Promise<{
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
    update(plantId: string, id: string, data: any): Promise<{
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
    remove(plantId: string, id: string): Promise<{
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
