import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
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
        };
    }>;
    refreshTokens(userId: string, refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
}
