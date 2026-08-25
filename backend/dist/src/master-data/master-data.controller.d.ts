import { MasterDataService } from './master-data.service';
export declare class MasterDataController {
    private readonly masterDataService;
    constructor(masterDataService: MasterDataService);
    private extractPlantId;
    getTrucks(headers: any, page?: string, limit?: string): Promise<{
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
    getAllTrucks(headers: any, page?: string, limit?: string): Promise<{
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
    createTruck(headers: any, data: {
        truckNumber: string;
        capacity?: number;
        isApproved?: boolean;
        transportCategory?: string;
    }, req: any, file?: Express.Multer.File): Promise<{
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
    createDriver(headers: any, data: {
        name: string;
        licenseNo?: string;
        phone?: string;
    }, req: any): Promise<{
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
    getStaff(headers: any): Promise<{
        id: string;
        plantId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        phone: string | null;
        role: string;
    }[]>;
    createStaff(headers: any, data: {
        name: string;
        role: string;
        phone?: string;
    }): Promise<{
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
    getLabour(headers: any, page?: string, limit?: string): Promise<{
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
    createLabour(headers: any, data: {
        name: string;
        type?: string;
        contact?: string;
        firmName?: string;
    }, req: any): Promise<{
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
    getPahunch(headers: any, page?: string, limit?: string): Promise<{
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
    createPahunch(headers: any, data: {
        name: string;
        contact?: string;
    }, req: any): Promise<{
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
