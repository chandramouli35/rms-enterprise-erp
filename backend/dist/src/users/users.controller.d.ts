import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(req: any, page?: string, limit?: string, search?: string, role?: string): Promise<{
        data: {
            id: string;
            username: string;
            email: string;
            role: string;
            plants: string[];
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    create(data: any, req: any): Promise<{
        id: string;
        username: string;
        email: string;
        role: string;
    }>;
}
