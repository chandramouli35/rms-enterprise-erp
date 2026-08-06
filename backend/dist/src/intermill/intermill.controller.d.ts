import { IntermillService } from './intermill.service';
export declare class IntermillController {
    private readonly intermillService;
    constructor(intermillService: IntermillService);
    create(req: any, createIntermillDto: any): Promise<{
        outputs: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            outputBags: number;
            productId: string;
            batchId: string;
        }[];
    } & {
        id: string;
        batchNo: string;
        shift: string;
        date: Date;
        startTime: string;
        endTime: string;
        inputBags: number;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        supervisorId: string;
        rawMaterialId: string;
        plantId: string;
    }>;
    findAll(req: any): Promise<({
        supervisor: {
            username: string;
        };
        rawMaterial: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            type: string;
            description: string | null;
        };
        outputs: ({
            product: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                type: string;
                description: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            outputBags: number;
            productId: string;
            batchId: string;
        })[];
    } & {
        id: string;
        batchNo: string;
        shift: string;
        date: Date;
        startTime: string;
        endTime: string;
        inputBags: number;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        supervisorId: string;
        rawMaterialId: string;
        plantId: string;
    })[]>;
    approve(id: string, req: any): Promise<{
        id: string;
        batchNo: string;
        shift: string;
        date: Date;
        startTime: string;
        endTime: string;
        inputBags: number;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        supervisorId: string;
        rawMaterialId: string;
        plantId: string;
    }>;
}
