import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(req: any): Promise<{
        id: string;
        username: string;
        email: string;
        role: string;
        plants: string[];
    }[]>;
    create(data: any, req: any): Promise<{
        id: string;
        username: string;
        email: string;
        role: string;
    }>;
}
