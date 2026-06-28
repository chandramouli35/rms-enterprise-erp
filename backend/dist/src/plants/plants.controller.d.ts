import { PlantsService } from './plants.service';
export declare class PlantsController {
    private readonly plantsService;
    constructor(plantsService: PlantsService);
    findAll(page?: string, limit?: string, search?: string): Promise<{
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            name: string;
            location: string | null;
            code: string;
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
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        name: string;
        location: string | null;
        code: string;
    }>;
}
