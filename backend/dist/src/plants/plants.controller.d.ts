import { PlantsService } from './plants.service';
export declare class PlantsController {
    private readonly plantsService;
    constructor(plantsService: PlantsService);
    findAll(): Promise<{
        id: string;
        name: string;
        location: string | null;
        code: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }[]>;
    create(data: any): Promise<{
        id: string;
        name: string;
        location: string | null;
        code: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
}
