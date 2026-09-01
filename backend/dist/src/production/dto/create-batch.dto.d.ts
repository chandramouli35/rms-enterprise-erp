export declare class CreateBatchDto {
    plantId: string;
    batchNo: string;
    date: string;
    shift: string;
    productionLine: string;
    paddyType: string;
    variety: string;
    paddySource?: string;
    paddyUsedQty: number;
    moisture?: number;
    remarks?: string;
    productionType?: string;
    paddyDryingTargetStack?: string;
    stackInputs?: Array<{
        stackNo: string;
        bags: string | number;
        isDirectUnload: boolean;
    }>;
    additionalOutputs?: Record<string, {
        produced: number;
        reused: number;
        wandProduced?: number;
        moisture?: number;
        targetStack?: string;
    }>;
}
