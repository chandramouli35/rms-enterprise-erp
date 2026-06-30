import { Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private prisma;
    constructor(prisma: PrismaService);
    validate(payload: any): Promise<({
        role: {
            modulePermissions: {
                id: string;
                roleId: string;
                createdAt: Date;
                updatedAt: Date;
                moduleName: string;
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
    }) | null>;
}
export {};
