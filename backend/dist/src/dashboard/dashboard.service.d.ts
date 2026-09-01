import { PrismaService } from '../prisma/prisma.service';
export declare class DashboardService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getMetrics(plantId: string, filter?: string): Promise<{
        procurementMT: number;
        procurementTrend: string;
        productionMT: number;
        productionTrend: string;
        averageYield: string;
        yieldTrend: string;
        inventoryMT: number;
        inventoryTrend: string;
        dispatchMT: number;
        dispatchTrend: string;
        gatePasses: number;
        activeUsers: number;
    }>;
    getProcurementChart(filter?: string): Promise<{
        name: string;
        value: number;
        color: string;
    }[]>;
    getYieldTrend(plantId: string, filter?: string): Promise<{
        name: string;
        value: number;
    }[]>;
    getStockDonut(plantId: string, filter?: string): Promise<{
        name: string;
        value: number;
        color: any;
        percent: string;
    }[]>;
    getRecentActivities(plantId: string): Promise<{
        title: string;
        details: string;
        time: string;
        type: string;
    }[]>;
    getAlerts(plantId: string): Promise<any[]>;
    getTodaySummary(plantId: string): Promise<{
        paddyProcured: number;
        production: number;
        averageYield: number;
        dispatch: number;
        powerConsumption: number;
        activeGatePasses: number;
        netShortageQtl: number;
    }>;
}
