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
                roleId: string;
                createdAt: Date;
                updatedAt: Date;
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
                    createdAt: Date;
                    updatedAt: Date;
                    deletedAt: Date | null;
                    name: string;
                    location: string | null;
                    code: string;
                };
            } & {
                userId: string;
                plantId: string;
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
                roleId: string;
                createdAt: Date;
                updatedAt: Date;
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
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            name: string;
            description: string | null;
        };
    } & {
        id: string;
        username: string;
        email: string;
        passwordHash: string;
        refreshToken: string | null;
        isActive: boolean;
        roleId: string;
        lastLogin: Date | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }) | null>;
    testPermissions(): Promise<{
        id: string;
        roleId: string;
        createdAt: Date;
        updatedAt: Date;
        moduleName: string;
        subModuleName: string;
        canView: boolean;
        canAdd: boolean;
        canEdit: boolean;
        canDelete: boolean;
        canApprove: boolean;
    }[] | undefined>;
}
