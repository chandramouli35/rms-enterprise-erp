import { PowerManagementService } from './power-management.service';
export declare class PowerManagementController {
    private readonly powerManagementService;
    constructor(powerManagementService: PowerManagementService);
    private getPlantId;
    getDashboard(headers: any): Promise<{
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
    getSources(headers: any): Promise<{
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
    getTrend(headers: any): Promise<{
        time: string;
        grid: number;
        generator: number;
    }[]>;
    getLoadDistribution(headers: any): Promise<{
        id: string;
        plantId: string;
        sectionName: string;
        loadValue: number;
        percentage: number;
        colorHex: string;
    }[]>;
    getAlerts(headers: any): Promise<{
        id: string;
        plantId: string;
        description: string | null;
        type: string;
        timestamp: Date;
        title: string;
    }[]>;
    getSettings(headers: any): Promise<{
        id: string;
        updatedAt: Date;
        plantId: string;
        highLoadWarning: number;
        criticalLoadAlert: number;
        autoStartGenerator: boolean;
        gridPowerRate: number;
        dieselCost: number;
    }>;
    updateSettings(headers: any, data: any): Promise<{
        id: string;
        updatedAt: Date;
        plantId: string;
        highLoadWarning: number;
        criticalLoadAlert: number;
        autoStartGenerator: boolean;
        gridPowerRate: number;
        dieselCost: number;
    }>;
    seedData(headers: any): Promise<{
        message: string;
    }>;
}
