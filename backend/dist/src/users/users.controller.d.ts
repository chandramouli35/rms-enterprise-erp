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
    grantOverride(data: {
        targetUserId: string;
        permissionType: string;
    }, req: any): Promise<{
        id: string;
        createdAt: Date;
        plantId: string;
        isActive: boolean;
        userId: string;
        permissionType: string;
        grantedBy: string;
        expiresAt: Date;
    }>;
    getActiveOverrides(req: any): Promise<{
        id: string;
        createdAt: Date;
        plantId: string;
        isActive: boolean;
        userId: string;
        permissionType: string;
        grantedBy: string;
        expiresAt: Date;
    }[]>;
}
