import { MasterDataService } from './master-data.service';
export declare class MasterDataController {
    private readonly masterDataService;
    constructor(masterDataService: MasterDataService);
    private extractPlantId;
    getTrucks(headers: any, page?: string, limit?: string): Promise<{
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
    getAllTrucks(headers: any, page?: string, limit?: string): Promise<{
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
    createTruck(headers: any, data: {
        truckNumber: string;
        capacity?: number;
        isApproved?: boolean;
        transportCategory?: string;
    }, req: any, file?: Express.Multer.File): Promise<{
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
    createDriver(headers: any, data: {
        name: string;
        licenseNo?: string;
        phone?: string;
    }, req: any): Promise<{
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
    getStaff(headers: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        plantId: string;
        role: string;
        phone: string | null;
    }[]>;
    createStaff(headers: any, data: {
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
    getLabour(headers: any, page?: string, limit?: string): Promise<{
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
    createLabour(headers: any, data: {
        name: string;
        type?: string;
        contact?: string;
        firmName?: string;
    }, req: any): Promise<{
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
    getPahunch(headers: any, page?: string, limit?: string): Promise<{
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
    createPahunch(headers: any, data: {
        name: string;
        contact?: string;
    }, req: any): Promise<{
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
