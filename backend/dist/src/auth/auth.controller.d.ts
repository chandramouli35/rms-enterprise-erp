import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import type { Request } from 'express';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            username: string;
            email: string;
            role: string;
            permissions: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                roleId: string;
                moduleName: string;
                subModuleName: string;
                canView: boolean;
                canAdd: boolean;
                canEdit: boolean;
                canDelete: boolean;
                canApprove: boolean;
            }[];
            plantAccess: ({
                plant: {
                    id: string;
                    name: string;
                    location: string | null;
                    code: string;
                    standardBagWeight: number;
                    aClassBagWeight: number;
                    bClassBagWeight: number;
                    createdAt: Date;
                    updatedAt: Date;
                    deletedAt: Date | null;
                };
            } & {
                plantId: string;
                userId: string;
            })[];
        };
    }>;
    refreshTokens(req: Request): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    getMe(req: Request): Promise<({
        role: {
            modulePermissions: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                roleId: string;
                moduleName: string;
                subModuleName: string;
                canView: boolean;
                canAdd: boolean;
                canEdit: boolean;
                canDelete: boolean;
                canApprove: boolean;
            }[];
        } & {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            description: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        username: string;
        email: string;
        passwordHash: string;
        refreshToken: string | null;
        isActive: boolean;
        roleId: string;
        lastLogin: Date | null;
    }) | null>;
    testPermissions(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        roleId: string;
        moduleName: string;
        subModuleName: string;
        canView: boolean;
        canAdd: boolean;
        canEdit: boolean;
        canDelete: boolean;
        canApprove: boolean;
    }[] | undefined>;
}
