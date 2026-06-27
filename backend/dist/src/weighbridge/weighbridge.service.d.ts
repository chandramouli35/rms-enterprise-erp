import { PrismaService } from '../prisma/prisma.service';
export declare class WeighbridgeService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    captureWeight(plantId: string, user: any, data: any): Promise<{
        success: boolean;
    }>;
}
