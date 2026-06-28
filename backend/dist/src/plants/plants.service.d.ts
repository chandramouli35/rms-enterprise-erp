import { PrismaService } from '../prisma/prisma.service';
export declare class PlantsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(page?: number, limit?: number, search?: string): Promise<{
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            name: string;
            location: string | null;
            code: string;
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
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        name: string;
        location: string | null;
        code: string;
    }>;
}
