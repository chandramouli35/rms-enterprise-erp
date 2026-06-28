import { QualityChecksService } from './quality-checks.service';
export declare class QualityChecksController {
    private readonly qualityChecksService;
    constructor(qualityChecksService: QualityChecksService);
    private getPlantId;
    create(data: any, req: any): Promise<{
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
    }>;
}
