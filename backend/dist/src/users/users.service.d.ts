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
    grantOverride(plantId: string, targetUserId: string, permissionType: string, grantedBy: string): Promise<{
        id: string;
        createdAt: Date;
        plantId: string;
        isActive: boolean;
        userId: string;
        permissionType: string;
        grantedBy: string;
        expiresAt: Date;
    }>;
    getActiveOverrides(plantId: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        plantId: string;
        isActive: boolean;
        userId: string;
        permissionType: string;
        grantedBy: string;
        expiresAt: Date;
    }[]>;
}
