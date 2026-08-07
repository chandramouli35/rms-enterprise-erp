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
    getAllTrucks(headers: any, page?: string, limit?: string): Promise<{
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
    createTruck(headers: any, data: {
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
    getDrivers(headers: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        plantId: string;
        licenseNo: string | null;
        phone: string | null;
    }[]>;
    createDriver(headers: any, data: {
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
    createLabour(headers: any, data: {
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
