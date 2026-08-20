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
    additionalOutputs?: Record<string, {
        produced: number;
        reused: number;
        wandProduced?: number;
    }>;
}
