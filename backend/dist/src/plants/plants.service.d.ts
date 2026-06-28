import { PrismaService } from '../prisma/prisma.service';
export declare class PlantsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(page?: number, limit?: number, search?: string): Promise<{
        data: {
            id: string;
            name: string;
            location: string | null;
            code: string;
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
    create(data: any): Promise<{
        id: string;
        name: string;
        location: string | null;
        code: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
}
