export declare class CreateTransferDto {
    fromPlantId: string;
    toPlantId: string;
    date: string;
    item: string;
    variety?: string;
    quantity: number;
    estimatedValue?: number;
    expectedDelivery?: string;
    vehicleNo?: string;
    driverName?: string;
    remarks?: string;
}
export declare class UpdateTransferStatusDto {
    status: string;
}
