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
        transportCategory: string;
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
            transportCategory: string;
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
        transportCategory: string;
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
            transportCategory: string;
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
        createdAt: Date;
        updatedAt: Date;
        plantId: string;
        truckNumber: string;
        capacity: number | null;
        imageUrl: string | null;
        isApproved: boolean;
        transportCategory: string;
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
        transportCategory: string;
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
        transportCategory: string;
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
        transportCategory: string;
    }>;
    getDrivers(): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        plantId: string;
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
        name: string;
        createdAt: Date;
        updatedAt: Date;
        plantId: string;
        licenseNo: string | null;
        phone: string | null;
        age: number | null;
    }>;
    deleteDriver(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        plantId: string;
        licenseNo: string | null;
        phone: string | null;
        age: number | null;
    }>;
    getFirstPlant(): Promise<{
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
    } | null>;
    updateDriver(id: string, data: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        plantId: string;
        licenseNo: string | null;
        phone: string | null;
        age: number | null;
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
    }, userId?: string): Promise<{
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
        firmName: string | null;
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
            firmName: string | null;
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
        name: string;
        createdAt: Date;
        updatedAt: Date;
        plantId: string;
        isActive: boolean;
        contact: string | null;
        type: string | null;
        firmName: string | null;
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
        firmName: string | null;
    }>;
    getPahunch(plantId: string, page?: string, limit?: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        plantId: string;
        isActive: boolean;
        contact: string | null;
    }[] | {
        data: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            plantId: string;
            isActive: boolean;
            contact: string | null;
        }[];
        total: number;
    }>;
    createPahunch(plantId: string, data: {
        name: string;
        contact?: string;
    }, userId?: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        plantId: string;
        isActive: boolean;
        contact: string | null;
    }>;
    deletePahunch(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        plantId: string;
        isActive: boolean;
        contact: string | null;
    }>;
}
