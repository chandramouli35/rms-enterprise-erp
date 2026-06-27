import { PrismaService } from '../prisma/prisma.service';
export declare class GatePassesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(plantId: string, userId: string, data: any): Promise<({
        supplier: {
            plantId: string;
            id: string;
            email: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            name: string;
            code: string;
            phone: string | null;
            address: string | null;
            gstNumber: string | null;
        } | null;
    } & {
        plantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        status: string;
        passNumber: string;
        vehicleNumber: string;
        driverName: string | null;
        driverLicense: string | null;
        source: string;
        supplierId: string | null;
        estimatedBags: number | null;
        createdByUserId: string;
    }) | undefined>;
    findAll(plantId: string): Promise<({
        supplier: {
            plantId: string;
            id: string;
            email: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            name: string;
            code: string;
            phone: string | null;
            address: string | null;
            gstNumber: string | null;
        } | null;
    } & {
        plantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        status: string;
        passNumber: string;
        vehicleNumber: string;
        driverName: string | null;
        driverLicense: string | null;
        source: string;
        supplierId: string | null;
        estimatedBags: number | null;
        createdByUserId: string;
    })[]>;
    scanBarcode(plantId: string, barcode: string): Promise<{
        supplier: {
            plantId: string;
            id: string;
            email: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            name: string;
            code: string;
            phone: string | null;
            address: string | null;
            gstNumber: string | null;
        } | null;
        qualityCheck: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            gatePassId: string;
            status: string;
            moisturePercentage: number;
            discolorationPercentage: number;
            brokenGrainsPercentage: number;
            foreignMatterPercentage: number;
            priceDeductionPerMT: number;
            inspectorId: string;
        } | null;
        weighbridge: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            netWeight: number | null;
            gatePassId: string;
            grossWeight: number | null;
            tareWeight: number | null;
            overrideReason: string | null;
            grossTimestamp: Date | null;
            tareTimestamp: Date | null;
            manualOverrideFlag: boolean;
            approvedByUserId: string | null;
        } | null;
    } & {
        plantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        status: string;
        passNumber: string;
        vehicleNumber: string;
        driverName: string | null;
        driverLicense: string | null;
        source: string;
        supplierId: string | null;
        estimatedBags: number | null;
        createdByUserId: string;
    }>;
}
