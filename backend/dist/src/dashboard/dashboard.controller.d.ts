import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    getSummary(req: any): Promise<{
        activeUsers: number;
        procurementMT: number;
        inventoryMT: number;
        gatePasses: number;
    }>;
}
