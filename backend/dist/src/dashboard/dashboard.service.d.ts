import { PrismaService } from '../prisma/prisma.service';
export declare class DashboardService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getSummary(plantId: string): Promise<{
        activeUsers: number;
        procurementMT: number;
        inventoryMT: number;
        gatePasses: number;
    }>;
}
