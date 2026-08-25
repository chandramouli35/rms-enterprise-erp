import { PrismaService } from '../prisma/prisma.service';
export declare class MasterDataService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private uploadImageToCloudinary;
    getTrucks(plantId: string, page?: string, limit?: string): Promise<{
        id: string;
        plantId: string;
        truckNumber: string;
        capacity: number | null;
        imageUrl: string | null;
        isApproved: boolean;
        transportCategory: string;
        createdAt: Date;
        updatedAt: Date;
    }[] | {
        data: {
            id: string;
            plantId: string;
            truckNumber: string;
            capacity: number | null;
            imageUrl: string | null;
            isApproved: boolean;
            transportCategory: string;
            createdAt: Date;
            updatedAt: Date;
        }[];
        total: number;
    }>;
    getAllTrucks(plantId: string, page?: string, limit?: string): Promise<{
        id: string;
        plantId: string;
        truckNumber: string;
        capacity: number | null;
        imageUrl: string | null;
        isApproved: boolean;
        transportCategory: string;
        createdAt: Date;
        updatedAt: Date;
    }[] | {
        data: {
            id: string;
            plantId: string;
            truckNumber: string;
            capacity: number | null;
            imageUrl: string | null;
            isApproved: boolean;
            transportCategory: string;
            createdAt: Date;
            updatedAt: Date;
        }[];
        total: number;
    }>;
    createTruck(plantId: string, data: {
        truckNumber: string;
        capacity?: number;
        isApproved?: boolean;
        transportCategory?: string;
    }, file?: Express.Multer.File, userId?: string): Promise<{
        id: string;
        plantId: string;
        truckNumber: string;
        capacity: number | null;
        imageUrl: string | null;
        isApproved: boolean;
        transportCategory: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    approveTruck(id: string): Promise<{
        id: string;
        plantId: string;
        truckNumber: string;
        capacity: number | null;
        imageUrl: string | null;
        isApproved: boolean;
        transportCategory: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    rejectTruck(id: string): Promise<{
        id: string;
        plantId: string;
        truckNumber: string;
        capacity: number | null;
        imageUrl: string | null;
        isApproved: boolean;
        transportCategory: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteTruck(id: string): Promise<{
        id: string;
        plantId: string;
        truckNumber: string;
        capacity: number | null;
        imageUrl: string | null;
        isApproved: boolean;
        transportCategory: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getDrivers(): Promise<{
        id: string;
        plantId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        licenseNo: string | null;
        phone: string | null;
        age: number | null;
    }[]>;
    createDriver(plantId: string, data: {
        name: string;
        licenseNo?: string;
        phone?: string;
    }, userId?: string): Promise<{
        id: string;
        plantId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        licenseNo: string | null;
        phone: string | null;
        age: number | null;
    }>;
    deleteDriver(id: string): Promise<{
        id: string;
        plantId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        licenseNo: string | null;
        phone: string | null;
        age: number | null;
    }>;
    getFirstPlant(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
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
        deletedAt: Date | null;
    } | null>;
    updateDriver(id: string, data: any): Promise<{
        id: string;
        plantId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        licenseNo: string | null;
        phone: string | null;
        age: number | null;
    }>;
    getStaff(plantId: string): Promise<{
        id: string;
        plantId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        phone: string | null;
        role: string;
    }[]>;
    createStaff(plantId: string, data: {
        name: string;
        role: string;
        phone?: string;
    }, userId?: string): Promise<{
        id: string;
        plantId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        phone: string | null;
        role: string;
    }>;
    deleteStaff(id: string): Promise<{
        id: string;
        plantId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        phone: string | null;
        role: string;
    }>;
    getLabour(plantId: string, page?: string, limit?: string): Promise<{
        id: string;
        plantId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        firmName: string | null;
        contact: string | null;
        type: string | null;
        isActive: boolean;
    }[] | {
        data: {
            id: string;
            plantId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            firmName: string | null;
            contact: string | null;
            type: string | null;
            isActive: boolean;
        }[];
        total: number;
    }>;
    createLabour(plantId: string, data: {
        name: string;
        type?: string;
        contact?: string;
        firmName?: string;
    }, userId?: string): Promise<{
        id: string;
        plantId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        firmName: string | null;
        contact: string | null;
        type: string | null;
        isActive: boolean;
    }>;
    deleteLabour(id: string): Promise<{
        id: string;
        plantId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        firmName: string | null;
        contact: string | null;
        type: string | null;
        isActive: boolean;
    }>;
    getPahunch(plantId: string, page?: string, limit?: string): Promise<{
        id: string;
        plantId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        contact: string | null;
        isActive: boolean;
    }[] | {
        data: {
            id: string;
            plantId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            contact: string | null;
            isActive: boolean;
        }[];
        total: number;
    }>;
    createPahunch(plantId: string, data: {
        name: string;
        contact?: string;
    }, userId?: string): Promise<{
        id: string;
        plantId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        contact: string | null;
        isActive: boolean;
    }>;
    deletePahunch(id: string): Promise<{
        id: string;
        plantId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        contact: string | null;
        isActive: boolean;
    }>;
}
