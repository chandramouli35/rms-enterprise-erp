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
exports.TransfersService = exports.CreateTransferDto = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const inventory_service_1 = require("../inventory/inventory.service");
const client_1 = require("@prisma/client");
class CreateTransferDto {
}
exports.CreateTransferDto = CreateTransferDto;
let TransfersService = class TransfersService {
    constructor(prisma, inventoryService) {
        this.prisma = prisma;
        this.inventoryService = inventoryService;
    }
    async initiateTransfer(dto, userId) {
        if (dto.sourcePlantId === dto.targetPlantId) {
            throw new common_1.BadRequestException('Source and Target plants must be different.');
        }
        const inventoryItem = await this.prisma.inventoryItem.findUnique({
            where: {
                plantId_itemType: {
                    plantId: dto.sourcePlantId,
                    itemType: dto.itemType,
                }
            }
        });
        if (!inventoryItem || inventoryItem.quantity < dto.quantity) {
            throw new common_1.BadRequestException(`Insufficient stock at source plant. Available: ${inventoryItem?.quantity || 0}`);
        }
        const transfer = await this.prisma.plantTransfer.create({
            data: {
                sourcePlantId: dto.sourcePlantId,
                targetPlantId: dto.targetPlantId,
                itemType: dto.itemType,
                quantity: dto.quantity,
                status: client_1.TransferStatus.IN_TRANSIT,
                initiatedBy: userId,
            }
        });
        await this.inventoryService.processTransaction({
            plantId: dto.sourcePlantId,
            itemType: dto.itemType,
            itemCategory: dto.itemCategory,
            quantity: -dto.quantity,
            transactionType: client_1.TransactionType.TRANSFER,
            referenceId: transfer.id,
            remarks: `Transfer OUT to Plant ${dto.targetPlantId}`,
        });
        return transfer;
    }
    async receiveTransfer(transferId, userId, itemCategory) {
        const transfer = await this.prisma.plantTransfer.findUnique({ where: { id: transferId } });
        if (!transfer)
            throw new common_1.NotFoundException('Transfer not found');
        if (transfer.status !== client_1.TransferStatus.IN_TRANSIT) {
            throw new common_1.BadRequestException(`Transfer is not in IN_TRANSIT status. Current: ${transfer.status}`);
        }
        const updatedTransfer = await this.prisma.plantTransfer.update({
            where: { id: transferId },
            data: {
                status: client_1.TransferStatus.RECEIVED,
                receivedBy: userId,
            }
        });
        await this.inventoryService.processTransaction({
            plantId: transfer.targetPlantId,
            itemType: transfer.itemType,
            itemCategory,
            quantity: transfer.quantity,
            transactionType: client_1.TransactionType.TRANSFER,
            referenceId: transfer.id,
            remarks: `Transfer IN from Plant ${transfer.sourcePlantId}`,
        });
        return updatedTransfer;
    }
    async getTransfersForPlant(plantId) {
        return this.prisma.plantTransfer.findMany({
            where: {
                OR: [
                    { sourcePlantId: plantId },
                    { targetPlantId: plantId }
                ]
            },
            orderBy: { createdAt: 'desc' },
            include: {
                sourcePlant: { select: { id: true, name: true, code: true } },
                targetPlant: { select: { id: true, name: true, code: true } }
            }
        });
    }
};
exports.TransfersService = TransfersService;
exports.TransfersService = TransfersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        inventory_service_1.InventoryService])
], TransfersService);
//# sourceMappingURL=transfers.service.js.map