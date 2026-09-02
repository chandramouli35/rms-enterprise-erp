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
        createdAt: Date;
        updatedAt: Date;
        batchNo: string;
        date: Date;
        shift: string;
        status: string;
        startTime: string;
        endTime: string;
        plantId: string;
        inputBags: number;
        supervisorId: string;
        rawMaterialId: string;
    }>;
    findAll(req: any): Promise<({
        supervisor: {
            username: string;
        };
        rawMaterial: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            category: string;
            type: string;
        };
        outputs: ({
            product: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                category: string;
                type: string;
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
        createdAt: Date;
        updatedAt: Date;
        batchNo: string;
        date: Date;
        shift: string;
        status: string;
        startTime: string;
        endTime: string;
        plantId: string;
        inputBags: number;
        supervisorId: string;
        rawMaterialId: string;
    })[]>;
    approve(id: string, req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        batchNo: string;
        date: Date;
        shift: string;
        status: string;
        startTime: string;
        endTime: string;
        plantId: string;
        inputBags: number;
        supervisorId: string;
        rawMaterialId: string;
    }>;
}
