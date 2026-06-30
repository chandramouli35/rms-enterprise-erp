import { PrismaService } from '../prisma/prisma.service';
export declare class GatePassService {
    private prisma;
    constructor(prisma: PrismaService);
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
