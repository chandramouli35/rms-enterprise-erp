import { PlantsService } from './plants.service';
export declare class PlantsController {
    private readonly plantsService;
    constructor(plantsService: PlantsService);
    findAll(page?: string, limit?: string): Promise<{
        id: string;
        name: string;
        location: string | null;
        code: string;
        standardBagWeight: number;
        aClassBagWeight: number;
        bClassBagWeight: number;
        govtRate: number | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }[] | {
        data: {
            id: string;
            name: string;
            location: string | null;
            code: string;
            standardBagWeight: number;
            aClassBagWeight: number;
            bClassBagWeight: number;
            govtRate: number | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
        }[];
        total: number;
    }>;
    create(data: any): Promise<{
        id: string;
        name: string;
        location: string | null;
        code: string;
        standardBagWeight: number;
        aClassBagWeight: number;
        bClassBagWeight: number;
        govtRate: number | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    update(id: string, data: any): Promise<{
        id: string;
        name: string;
        location: string | null;
        code: string;
        standardBagWeight: number;
        aClassBagWeight: number;
        bClassBagWeight: number;
        govtRate: number | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
}
