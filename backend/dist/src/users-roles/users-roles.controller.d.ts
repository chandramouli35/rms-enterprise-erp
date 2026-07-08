import { UsersRolesService } from './users-roles.service';
export declare class UsersRolesController {
    private readonly service;
    constructor(service: UsersRolesService);
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
        plant: string;
        status: string;
        lastLogin: string;
        avatar: string;
    }[]>;
    createUser(body: any): Promise<{
        username: string;
        id: string;
        email: string;
        passwordHash: string;
        refreshToken: string | null;
        isActive: boolean;
        roleId: string;
        lastLogin: Date | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    toggleStatus(id: string): Promise<{
        username: string;
        id: string;
        email: string;
        passwordHash: string;
        refreshToken: string | null;
        isActive: boolean;
        roleId: string;
        lastLogin: Date | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    getRoles(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        name: string;
        description: string | null;
    }[]>;
    createRole(body: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        name: string;
        description: string | null;
    }>;
    getRolePermissions(roleId: string): Promise<{
        name: string;
        permissions: {
            view: boolean;
            add: boolean;
            edit: boolean;
            delete: boolean;
            approve: boolean;
        };
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
