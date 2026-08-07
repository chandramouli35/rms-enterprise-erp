import { PrismaService } from '../prisma/prisma.service';
export declare class MasterDataService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private uploadImageToCloudinary;
    getTrucks(plantId: string, page?: string, limit?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        plantId: string;
        truckNumber: string;
        capacity: number | null;
        imageUrl: string | null;
        isApproved: boolean;
    }[] | {
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            plantId: string;
            truckNumber: string;
            capacity: number | null;
            imageUrl: string | null;
            isApproved: boolean;
        }[];
        total: number;
    }>;
    getAllTrucks(plantId: string, page?: string, limit?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        plantId: string;
        truckNumber: string;
        capacity: number | null;
        imageUrl: string | null;
        isApproved: boolean;
    }[] | {
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            plantId: string;
            truckNumber: string;
            capacity: number | null;
            imageUrl: string | null;
            isApproved: boolean;
        }[];
        total: number;
    }>;
    createTruck(plantId: string, data: {
        truckNumber: string;
        capacity?: number;
        isApproved?: boolean;
    }, file?: Express.Multer.File): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        plantId: string;
        truckNumber: string;
        capacity: number | null;
        imageUrl: string | null;
        isApproved: boolean;
    }>;
    approveTruck(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        plantId: string;
        truckNumber: string;
        capacity: number | null;
        imageUrl: string | null;
        isApproved: boolean;
    }>;
    rejectTruck(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        plantId: string;
        truckNumber: string;
        capacity: number | null;
        imageUrl: string | null;
        isApproved: boolean;
    }>;
    deleteTruck(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        plantId: string;
        truckNumber: string;
        capacity: number | null;
        imageUrl: string | null;
        isApproved: boolean;
    }>;
    getDrivers(plantId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        plantId: string;
        licenseNo: string | null;
        phone: string | null;
    }[]>;
    createDriver(plantId: string, data: {
        name: string;
        licenseNo?: string;
        phone?: string;
    }): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        plantId: string;
        licenseNo: string | null;
        phone: string | null;
    }>;
    deleteDriver(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        plantId: string;
        licenseNo: string | null;
        phone: string | null;
    }>;
    getStaff(plantId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        plantId: string;
        role: string;
        phone: string | null;
    }[]>;
    createStaff(plantId: string, data: {
        name: string;
        role: string;
        phone?: string;
    }): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        plantId: string;
        role: string;
        phone: string | null;
    }>;
    deleteStaff(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        plantId: string;
        role: string;
        phone: string | null;
    }>;
    getLabour(plantId: string, page?: string, limit?: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        plantId: string;
        isActive: boolean;
        contact: string | null;
        type: string | null;
    }[] | {
        data: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            plantId: string;
            isActive: boolean;
            contact: string | null;
            type: string | null;
        }[];
        total: number;
    }>;
    createLabour(plantId: string, data: {
        name: string;
        type?: string;
        contact?: string;
    }): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        plantId: string;
        isActive: boolean;
        contact: string | null;
        type: string | null;
    }>;
    deleteLabour(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        plantId: string;
        isActive: boolean;
        contact: string | null;
        type: string | null;
    }>;
}
