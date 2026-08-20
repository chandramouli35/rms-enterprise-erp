import { IntermillService } from './intermill.service';
export declare class IntermillController {
    private readonly intermillService;
    constructor(intermillService: IntermillService);
    create(req: any, createIntermillDto: any): Promise<{
        outputs: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            batchId: string;
            outputBags: number;
            productId: string;
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
        rawMaterialId: string;
        inputBags: number;
        supervisorId: string;
    }>;
    findAll(req: any): Promise<({
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
            batchId: string;
            outputBags: number;
            productId: string;
        })[];
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
        rawMaterialId: string;
        inputBags: number;
        supervisorId: string;
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
        rawMaterialId: string;
        inputBags: number;
        supervisorId: string;
    }>;
}
