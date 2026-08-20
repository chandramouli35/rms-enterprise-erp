import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(req: any): Promise<{
        id: string;
        username: string;
        email: string;
        role: string;
        roleId: string;
        plants: string[];
        plantAccess: ({
            plant: {
                id: string;
                name: string;
                location: string | null;
                code: string;
                standardBagWeight: number;
                aClassBagWeight: number;
                bClassBagWeight: number;
                govtRate: number | null;
                benchmarkMoisture: number | null;
                safaiCut: number | null;
                processingCut: number | null;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
            };
        } & {
            plantId: string;
            userId: string;
        })[];
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
