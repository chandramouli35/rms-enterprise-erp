import { PrismaService } from '../prisma/prisma.service';
export declare class PlantsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        id: string;
        name: string;
        location: string | null;
        code: string;
        standardBagWeight: number;
        aClassBagWeight: number;
        bClassBagWeight: number;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }[]>;
    create(data: any): Promise<{
        id: string;
        name: string;
        location: string | null;
        code: string;
        standardBagWeight: number;
        aClassBagWeight: number;
        bClassBagWeight: number;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    update(id: string, data: any): Promise<{
        id: string;
        name: string;
        location: string | null;
        code: string;
        standardBagWeight: number;
        aClassBagWeight: number;
        bClassBagWeight: number;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
}
