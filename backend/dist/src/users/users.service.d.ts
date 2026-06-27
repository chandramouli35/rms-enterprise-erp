import { PrismaService } from '../prisma/prisma.service';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(plantId: string): Promise<{
        id: string;
        username: string;
        email: string;
        role: string;
        plants: string[];
    }[]>;
    create(data: any, reqUser: any): Promise<{
        id: string;
        username: string;
        email: string;
        role: string;
    }>;
}
