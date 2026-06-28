import { PlantsService } from './plants.service';
export declare class PlantsController {
    private readonly plantsService;
    constructor(plantsService: PlantsService);
    findAll(page?: string, limit?: string, search?: string): Promise<{
        data: {
            id: string;
            name: string;
            location: string | null;
            code: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
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
