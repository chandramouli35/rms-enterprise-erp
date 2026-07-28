import { PrismaService } from '../prisma/prisma.service';
export declare class PowerManagementService {
    private prisma;
    constructor(prisma: PrismaService);
    getDashboard(plantId: string): Promise<{
        kpis: {
            totalConsumption: number;
            dgGenerated: number;
            totalCost: number;
            outages: number;
        };
        overview: {
            currentLoad: number;
            totalCapacity: number;
            loadPercentage: number;
            voltageAvg: number;
            frequencyAvg: number;
        };
    }>;
    getSources(plantId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        plantId: string;
        description: string | null;
        type: string;
        sourceName: string;
        currentOutput: number;
        runtime: string | null;
        fuelLevel: number | null;
    }[]>;
    getTrend(plantId: string): Promise<{
        time: string;
        grid: number;
        generator: number;
    }[]>;
    getLoadDistribution(plantId: string): Promise<{
        id: string;
        plantId: string;
        sectionName: string;
        loadValue: number;
        percentage: number;
        colorHex: string;
    }[]>;
    getAlerts(plantId: string): Promise<{
        id: string;
        plantId: string;
        description: string | null;
        type: string;
        timestamp: Date;
        title: string;
    }[]>;
    getSettings(plantId: string): Promise<{
        id: string;
        updatedAt: Date;
        plantId: string;
        highLoadWarning: number;
        criticalLoadAlert: number;
        autoStartGenerator: boolean;
        gridPowerRate: number;
        dieselCost: number;
    }>;
    updateSettings(plantId: string, data: any): Promise<{
        id: string;
        updatedAt: Date;
        plantId: string;
        highLoadWarning: number;
        criticalLoadAlert: number;
        autoStartGenerator: boolean;
        gridPowerRate: number;
        dieselCost: number;
    }>;
    seedMockData(plantId: string): Promise<{
        message: string;
    }>;
}
