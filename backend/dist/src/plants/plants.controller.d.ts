import { PlantsService } from './plants.service';
export declare class PlantsController {
    private readonly plantsService;
    constructor(plantsService: PlantsService);
    findAll(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        name: string;
        location: string | null;
        code: string;
    }[]>;
    create(data: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        name: string;
        location: string | null;
        code: string;
    }>;
}
