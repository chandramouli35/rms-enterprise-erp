import { ProcurementService } from './procurement.service';
export declare class ProcurementController {
    private readonly procurementService;
    constructor(procurementService: ProcurementService);
    savePurchase(data: any): Promise<{
        plantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        supplierId: string | null;
        gatePassId: string | null;
        weighbridgeId: string | null;
        netWeight: number | null;
        grossWeight: number | null;
        tareWeight: number | null;
        amount: number | null;
        deductions: number | null;
        netAmount: number | null;
    }>;
}
