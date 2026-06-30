import { GatePassService } from './gate-pass.service';
export declare class GatePassController {
    private readonly gatePassService;
    constructor(gatePassService: GatePassService);
    generateGatePass(data: any): Promise<{
        plantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date | null;
        passType: string;
        vehicleNo: string;
        purpose: string | null;
        driverName: string | null;
        contactNo: string | null;
        status: string;
        qrCode: string | null;
    }>;
    getCampusStatus(plantId: string): Promise<{
        activeInward: number;
        completed: number;
        total: number;
    }>;
}
