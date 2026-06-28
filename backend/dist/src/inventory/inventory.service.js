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
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let InventoryService = class InventoryService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async processTransaction(dto) {
        return this.prisma.$transaction(async (prisma) => {
            let inventoryItem = await prisma.inventoryItem.findUnique({
                where: {
                    plantId_itemType: {
                        plantId: dto.plantId,
                        itemType: dto.itemType,
                    },
                },
            });
            if (!inventoryItem) {
                inventoryItem = await prisma.inventoryItem.create({
                    data: {
                        plantId: dto.plantId,
                        itemType: dto.itemType,
                        itemCategory: dto.itemCategory,
                        quantity: 0,
                    },
                });
            }
            const newQuantity = inventoryItem.quantity + dto.quantity;
            if (newQuantity < 0 && dto.transactionType !== client_1.TransactionType.ADJUSTMENT) {
                throw new common_1.BadRequestException(`Insufficient stock for ${dto.itemType}. Current: ${inventoryItem.quantity}`);
            }
            const updatedItem = await prisma.inventoryItem.update({
                where: { id: inventoryItem.id },
                data: { quantity: newQuantity },
            });
            const ledger = await prisma.stockLedger.create({
                data: {
                    inventoryItemId: inventoryItem.id,
                    transactionType: dto.transactionType,
                    quantity: dto.quantity,
                    referenceId: dto.referenceId,
                    remarks: dto.remarks,
                },
            });
            return { inventoryItem: updatedItem, ledger };
        });
    }
    async getInventoryMatrix(plantId, category) {
        return this.prisma.inventoryItem.findMany({
            where: {
                plantId,
                ...(category ? { itemCategory: category } : {}),
            },
            include: {
                stockLedgers: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });
    }
    async getStockLedger(inventoryItemId) {
        return this.prisma.stockLedger.findMany({
            where: { inventoryItemId },
            orderBy: { createdAt: 'desc' },
        });
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map