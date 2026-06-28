import { GatePassesService } from './gate-passes.service';
export declare class GatePassesController {
    private readonly gatePassesService;
    constructor(gatePassesService: GatePassesService);
    private getPlantId;
    create(data: any, req: any): Promise<({
        supplier: {
            name: string;
            id: string;
            plantId: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            code: string;
            phone: string | null;
            email: string | null;
            address: string | null;
            gstNumber: string | null;
        } | null;
    } & {
        id: string;
        passNumber: string;
        vehicleNumber: string;
        driverName: string | null;
        driverLicense: string | null;
        source: string;
        supplierId: string | null;
        estimatedBags: number | null;
        status: string;
        plantId: string;
        createdByUserId: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }) | undefined>;
    findAll(req: any, page?: string, limit?: string, search?: string): Promise<{
        data: ({
            supplier: {
                name: string;
                id: string;
                plantId: string;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                code: string;
                phone: string | null;
                email: string | null;
                address: string | null;
                gstNumber: string | null;
            } | null;
        } & {
            id: string;
            passNumber: string;
            vehicleNumber: string;
            driverName: string | null;
            driverLicense: string | null;
            source: string;
            supplierId: string | null;
            estimatedBags: number | null;
            status: string;
            plantId: string;
            createdByUserId: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    scanBarcode(barcode: string, req: any): Promise<{
        supplier: {
            name: string;
            id: string;
            plantId: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            code: string;
            phone: string | null;
            email: string | null;
            address: string | null;
            gstNumber: string | null;
        } | null;
        qualityCheck: {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            gatePassId: string;
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
            gatePassId: string;
            grossWeight: number | null;
            tareWeight: number | null;
            netWeight: number | null;
            grossTimestamp: Date | null;
            tareTimestamp: Date | null;
            manualOverrideFlag: boolean;
            overrideReason: string | null;
            approvedByUserId: string | null;
        } | null;
    } & {
        id: string;
        passNumber: string;
        vehicleNumber: string;
        driverName: string | null;
        driverLicense: string | null;
        source: string;
        supplierId: string | null;
        estimatedBags: number | null;
        status: string;
        plantId: string;
        createdByUserId: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
}
