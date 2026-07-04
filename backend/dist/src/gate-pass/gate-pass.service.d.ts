import { PrismaService } from '../prisma/prisma.service';
export declare class GatePassService {
    private prisma;
    constructor(prisma: PrismaService);
    generateGatePass(data: any): Promise<{
        supplier: {
            id: string;
            email: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            status: string;
            contact: string | null;
            address: string | null;
        } | null;
    } & {
        plantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date | null;
        passType: string;
        vehicleNo: string;
        vehicleType: string | null;
        purpose: string | null;
        supplierId: string | null;
        material: string | null;
        driverName: string | null;
        contactNo: string | null;
        challanNo: string | null;
        noOfBags: number | null;
        grossWeight: number | null;
        tareWeight: number | null;
        netWeight: number | null;
        status: string;
        qrCode: string | null;
    }>;
    getRecentGatePasses(plantId: string, type: string): Promise<({
        supplier: {
            id: string;
            email: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            status: string;
            contact: string | null;
            address: string | null;
        } | null;
    } & {
        plantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date | null;
        passType: string;
        vehicleNo: string;
        vehicleType: string | null;
        purpose: string | null;
        supplierId: string | null;
        material: string | null;
        driverName: string | null;
        contactNo: string | null;
        challanNo: string | null;
        noOfBags: number | null;
        grossWeight: number | null;
        tareWeight: number | null;
        netWeight: number | null;
        status: string;
        qrCode: string | null;
    })[]>;
    getGatePassByQr(qrCode: string): Promise<{
        supplier: {
            id: string;
            email: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            status: string;
            contact: string | null;
            address: string | null;
        } | null;
    } & {
        plantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date | null;
        passType: string;
        vehicleNo: string;
        vehicleType: string | null;
        purpose: string | null;
        supplierId: string | null;
        material: string | null;
        driverName: string | null;
        contactNo: string | null;
        challanNo: string | null;
        noOfBags: number | null;
        grossWeight: number | null;
        tareWeight: number | null;
        netWeight: number | null;
        status: string;
        qrCode: string | null;
    }>;
    getAnalytics(plantId: string): Promise<{
        totalGateIn: number;
        totalGateOut: number;
        qrScanned: number;
        duplicatesBlocked: number;
        activeGatePass: number;
    }>;
    getCampusStatus(plantId: string): Promise<{
        activeInward: number;
        completed: number;
        total: number;
    }>;
    getDuplicateLogs(plantId: string): Promise<{
        plantId: string;
        id: string;
        createdAt: Date;
        vehicleNo: string;
        attemptedType: string;
        reason: string;
    }[]>;
}
