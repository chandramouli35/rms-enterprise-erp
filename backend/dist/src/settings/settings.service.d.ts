import { PrismaService } from '../prisma/prisma.service';
export declare class SettingsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getGlobalSetting(key: string): Promise<{
        key: string;
        value: string | null;
    }>;
    updateGlobalSetting(key: string, value: string): Promise<{
        id: string;
        updatedAt: Date;
        value: string;
        key: string;
    }>;
}
