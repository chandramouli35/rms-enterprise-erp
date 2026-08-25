import { PrismaService } from '../prisma/prisma.service';
export declare class PlantsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(page?: string, limit?: string): Promise<{
        id: string;
        name: string;
        location: string | null;
        code: string;
        standardBagWeight: number;
        aClassBagWeight: number;
        bClassBagWeight: number;
        govtRate: number | null;
        benchmarkMoisture: number | null;
        safaiCut: number | null;
        processingCut: number | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }[] | {
        data: {
            id: string;
            name: string;
            location: string | null;
            code: string;
            standardBagWeight: number;
            aClassBagWeight: number;
            bClassBagWeight: number;
            govtRate: number | null;
            benchmarkMoisture: number | null;
            safaiCut: number | null;
            processingCut: number | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
        }[];
        total: number;
    }>;
    create(data: any): Promise<{
        id: string;
        name: string;
        location: string | null;
        code: string;
        standardBagWeight: number;
        aClassBagWeight: number;
        bClassBagWeight: number;
        govtRate: number | null;
        benchmarkMoisture: number | null;
        safaiCut: number | null;
        processingCut: number | null;
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
        govtRate: number | null;
        benchmarkMoisture: number | null;
        safaiCut: number | null;
        processingCut: number | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        name: string;
        location: string | null;
        code: string;
        standardBagWeight: number;
        aClassBagWeight: number;
        bClassBagWeight: number;
        govtRate: number | null;
        benchmarkMoisture: number | null;
        safaiCut: number | null;
        processingCut: number | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
}
