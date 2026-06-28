import { PrismaService } from '../prisma/prisma.service';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(plantId: string, page?: number, limit?: number, search?: string, role?: string): Promise<{
        data: {
            id: string;
            username: string;
            email: string;
            role: string;
            plants: string[];
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    create(data: any, reqUser: any): Promise<{
        id: string;
        username: string;
        email: string;
        role: string;
    }>;
}
