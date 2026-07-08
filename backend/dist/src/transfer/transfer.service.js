"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let TransferService = class TransferService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getMetrics(plantId) {
        const where = plantId ? { OR: [{ fromPlantId: plantId }, { toPlantId: plantId }] } : {};
        const transfers = await this.prisma.interPlantTransfer.findMany({ where });
        let total = transfers.length;
        let approved = 0;
        let approvedValue = 0;
        let inTransit = 0;
        let inTransitValue = 0;
        let delivered = 0;
        let deliveredValue = 0;
        let cancelled = 0;
        let cancelledValue = 0;
        let inTransitQuantity = 0;
        let delayedTransfers = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (const t of transfers) {
            if (t.status === 'Approved') {
                approved++;
                approvedValue += t.estimatedValue || 0;
            }
            else if (t.status === 'In Transit' || t.status === 'Dispatched') {
                inTransit++;
                inTransitValue += t.estimatedValue || 0;
                inTransitQuantity += t.quantity || 0;
                if (t.expectedDelivery && new Date(t.expectedDelivery) < today) {
                    delayedTransfers++;
                }
            }
            else if (t.status === 'Delivered' || t.status === 'Completed') {
                delivered++;
                deliveredValue += t.estimatedValue || 0;
            }
            else if (t.status === 'Cancelled') {
                cancelled++;
                cancelledValue += t.estimatedValue || 0;
            }
        }
        return {
            total,
            approved,
            approvedValue,
            inTransit,
            inTransitValue,
            delivered,
            deliveredValue,
            cancelled,
            cancelledValue,
            inTransitQuantity,
            delayedTransfers,
        };
    }
    async getAllTransfers(plantId) {
        const where = plantId ? { OR: [{ fromPlantId: plantId }, { toPlantId: plantId }] } : {};
        return this.prisma.interPlantTransfer.findMany({
            where,
            orderBy: { date: 'desc' },
        });
    }
    async createTransfer(dto) {
        const count = await this.prisma.interPlantTransfer.count();
        const reqNo = `TRF-${new Date().getFullYear()}-${(count + 1).toString().padStart(5, '0')}`;
        return this.prisma.interPlantTransfer.create({
            data: {
                requestNo: reqNo,
                fromPlantId: dto.fromPlantId,
                toPlantId: dto.toPlantId,
                date: new Date(dto.date),
                item: dto.item,
                variety: dto.variety,
                quantity: dto.quantity,
                estimatedValue: dto.estimatedValue,
                expectedDelivery: dto.expectedDelivery ? new Date(dto.expectedDelivery) : null,
                vehicleNo: dto.vehicleNo,
                driverName: dto.driverName,
                remarks: dto.remarks,
                status: 'Approved',
            },
        });
    }
    async updateStatus(id, dto) {
        const transfer = await this.prisma.interPlantTransfer.findUnique({ where: { id } });
        if (!transfer)
            throw new common_1.NotFoundException('Transfer not found');
        const updateData = { status: dto.status };
        if (dto.status === 'Dispatched' || dto.status === 'In Transit') {
            updateData.dispatchedOn = new Date();
        }
        else if (dto.status === 'Delivered' || dto.status === 'Completed') {
            updateData.receivedOn = new Date();
        }
        return this.prisma.interPlantTransfer.update({
            where: { id },
            data: updateData,
        });
    }
};
exports.TransferService = TransferService;
exports.TransferService = TransferService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TransferService);
//# sourceMappingURL=transfer.service.js.map