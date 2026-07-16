import { PrismaService } from '../prisma/prisma.service';
export declare class UsersRolesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getStats(): Promise<{
        totalUsers: number;
        activeUsers: number;
        inactiveUsers: number;
        totalRoles: number;
        totalPermissions: number;
    }>;
    getUsersList(): Promise<{
        id: string;
        username: string;
        fullname: string;
        email: string;
        role: string;
        roleId: string;
        plant: string;
        plantId: string;
        status: string;
        lastLogin: string;
        avatar: string;
    }[]>;
    createUser(data: any): Promise<{
        isActive: boolean;
        id: string;
        username: string;
        email: string;
        passwordHash: string;
        refreshToken: string | null;
        roleId: string;
        lastLogin: Date | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    toggleUserStatus(id: string): Promise<{
        isActive: boolean;
        id: string;
        username: string;
        email: string;
        passwordHash: string;
        refreshToken: string | null;
        roleId: string;
        lastLogin: Date | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    updateUser(id: string, data: any): Promise<{
        isActive: boolean;
        id: string;
        username: string;
        email: string;
        passwordHash: string;
        refreshToken: string | null;
        roleId: string;
        lastLogin: Date | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    deleteUser(id: string): Promise<{
        message: string;
    }>;
    getRoles(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        name: string;
        description: string | null;
    }[]>;
    createRole(data: {
        name: string;
        description?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        name: string;
        description: string | null;
    }>;
    private readonly MODULE_STRUCTURE;
    getRolePermissions(roleId: string): Promise<{
        name: string;
        permissions: {
            view: boolean;
            add: boolean;
            edit: boolean;
            delete: boolean;
            approve: boolean;
        };
        subModules: {
            name: string;
            permissions: {
                view: boolean;
                add: boolean;
                edit: boolean;
                delete: boolean;
                approve: boolean;
            };
        }[];
    }[]>;
    updateRolePermissions(roleId: string, permissions: any[]): Promise<{
        name: string;
        permissions: {
            view: boolean;
            add: boolean;
            edit: boolean;
            delete: boolean;
            approve: boolean;
        };
        subModules: {
            name: string;
            permissions: {
                view: boolean;
                add: boolean;
                edit: boolean;
                delete: boolean;
                approve: boolean;
            };
        }[];
    }[]>;
    getAuditLogs(): Promise<{
        total: number;
        today: number;
        last7Days: number;
        last30Days: number;
    }>;
    getAuditList(): Promise<{
        id: string;
        user: string;
        action: string;
        module: string;
        details: string | null;
        time: string;
        avatar: string;
    }[]>;
}
