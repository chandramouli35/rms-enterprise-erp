import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as os from 'os';

@Injectable()
export class DispatchFinanceService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // DISPATCH
  // ==========================================
  async getDispatchMetrics(plantId: string) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const whereClause = plantId === 'all' ? {} : { plantId };

      const dispatches = await this.prisma.dispatch.findMany({
        where: whereClause,
      });

      const totalToday = dispatches.filter((d) => d.date >= today).reduce((acc, curr) => acc + curr.quantity, 0);
      const completed = dispatches.filter((d) => d.status === 'Completed').reduce((acc, curr) => acc + curr.quantity, 0);
      const inTransit = dispatches.filter((d) => d.status === 'In Transit').reduce((acc, curr) => acc + curr.quantity, 0);
      const pending = dispatches.filter((d) => d.status === 'Pending').reduce((acc, curr) => acc + curr.quantity, 0);

      return {
        totalToday,
        completed,
        inTransit,
        pending,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch dispatch metrics');
    }
  }

  async getAllDispatches(plantId: string) {
    const whereClause = plantId === 'all' ? {} : { plantId };
    return this.prisma.dispatch.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        gatePass: true
      }
    });
  }

  async createDispatch(plantId: string, data: any) {
    try {
      // Generate a dispatch number e.g. DIS-2026-0001
      const count = await this.prisma.dispatch.count({ where: { plantId } });
      const dispatchNo = `DIS-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

      return await this.prisma.dispatch.create({
        data: {
          plantId,
          dispatchNo,
          date: data.date ? new Date(data.date) : new Date(),
          partyName: data.partyName,
          item: data.item,
          quantity: parseFloat(data.quantity),
          status: 'Pending'
        }
      });
    } catch (error: any) {
      console.error('Error creating dispatch:', error);
      throw new InternalServerErrorException(error.message || 'Failed to create dispatch');
    }
  }

  async generateGatePass(plantId: string, data: any) {
    try {
      // Ensure dispatch exists and belongs to plant
      const dispatch = await this.prisma.dispatch.findUnique({
        where: { id: data.dispatchId }
      });

      if (!dispatch || dispatch.plantId !== plantId) {
        throw new InternalServerErrorException('Invalid dispatch record');
      }

      if (dispatch.gatePassId) {
        throw new InternalServerErrorException('Gate pass already generated for this dispatch');
      }

      return await this.prisma.$transaction(async (tx) => {
        // 1. Create OUTWARD Gate Pass
        const gatePass = await tx.gatePass.create({
          data: {
            plantId,
            passType: 'OUTWARD',
            purpose: 'DISPATCH',
            vehicleNo: data.vehicleNo,
            driverName: data.driverName,
            contactNo: data.contactNo,
            material: dispatch.item,
            status: 'ACTIVE'
          }
        });

        // 1.5 Create Weighbridge Transaction
        await tx.weighbridgeTransaction.create({
          data: {
            plantId,
            vehicleNo: data.vehicleNo,
            transactionType: 'OUTWARD',
            driverName: data.driverName,
            materialType: dispatch.item,
            status: 'PENDING_TARE',
            gatePassId: gatePass.id
          }
        });

        // 2. Update Dispatch
        await tx.dispatch.update({
          where: { id: dispatch.id },
          data: {
            gatePassId: gatePass.id,
            vehicleNo: data.vehicleNo,
            status: 'In Transit'
          }
        });

        return gatePass;
      });
    } catch (error: any) {
      console.error('Error generating gate pass:', error);
      throw new InternalServerErrorException(error.message || 'Failed to generate gate pass');
    }
  }

  // ==========================================
  // WEIGHT VERIFICATION
  // ==========================================
  async getWeightVerifications(plantId: string) {
    const whereClause = plantId === 'all' ? {} : { plantId };
    return this.prisma.weighbridgeTransaction.findMany({
      where: { ...whereClause, transactionType: 'OUTWARD' },
      include: {
        gatePass: {
          include: {
            dispatch: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async readWeighbridge(plantId: string) {
    // Simulate reading from a physical serial port weighbridge
    const randomWeight = Math.floor(Math.random() * 20000) + 10000; // 10,000kg to 30,000kg
    return { weight: randomWeight, unit: 'kg', status: 'Stable' };
  }

  async createWeightEntry(plantId: string, data: any) {
    try {
      const transaction = await this.prisma.weighbridgeTransaction.findUnique({
        where: { id: data.transactionId },
        include: { gatePass: { include: { dispatch: true } } }
      });

      if (!transaction) throw new InternalServerErrorException('Transaction not found');

      return await this.prisma.$transaction(async (tx) => {
        // 1. Update Weighbridge Transaction
        const updatedTx = await tx.weighbridgeTransaction.update({
          where: { id: transaction.id },
          data: {
            tareWeight: data.tareWeight,
            grossWeight: data.grossWeight,
            netWeight: data.netWeight,
            tareTime: new Date(),
            grossTime: new Date(),
            status: 'COMPLETED'
          }
        });

        const dispatch = transaction.gatePass?.dispatch;

        if (dispatch) {
          // 2. Update Dispatch Status
          await tx.dispatch.update({
            where: { id: dispatch.id },
            data: { status: 'Completed' }
          });

          // 3. Deduct Inventory (Assuming material exists)
          const inventory = await tx.inventory.findFirst({
            where: { plantId: transaction.plantId, itemType: dispatch.item }
          });

          if (inventory) {
            await tx.inventory.update({
              where: { id: inventory.id },
              data: { usable: inventory.usable - data.netWeight }
            });

            // 4. Record in Stock Ledger
            await tx.stockLedger.create({
              data: {
                plantId: transaction.plantId,
                transaction: 'OUT',
                itemType: dispatch.item,
                quantity: data.netWeight,
                reference: dispatch.dispatchNo,
                remarks: `Dispatched via Gate Pass ${transaction.gatePass?.vehicleNo}`
              }
            });
          }

          // 5. Create Pending Sale in Finance Ledger
          // We don't have price info here easily, so we can use a dummy value or 0, or calculate based on standard rates.
          await tx.financeTransaction.create({
            data: {
              plantId: transaction.plantId,
              transactionType: 'SALE',
              totalAmount: 0, // Accountant will fill this out when they invoice
              partyName: dispatch.partyName,
              invoiceNo: dispatch.dispatchNo,
              paymentStatus: 'UNPAID'
            }
          });
        }

        return updatedTx;
      });
    } catch (error: any) {
      console.error('Error recording weight:', error);
      throw new InternalServerErrorException(error.message || 'Failed to record weight');
    }
  }

  // ==========================================
  // VEHICLE ALLOCATION
  // ==========================================
  async getVehicleAllocationStats(plantId: string) {
    const whereClause = plantId === 'all' ? {} : { plantId };

    const allocated = await this.prisma.dispatch.count({
      where: { ...whereClause, status: { in: ['Pending', 'In Transit'] } }
    });
    
    // Approximate available vehicles logic - just for demonstration, based on gatepasses
    const gatePasses = await this.prisma.gatePass.count({
      where: { ...whereClause, passType: 'OUTWARD', status: 'ACTIVE' }
    });

    return {
      allocatedVehicles: allocated,
      availableVehicles: 15, // Arbitrary for now as we don't track idle vehicles
      gatePassGenerated: gatePasses,
      pendingGatePass: await this.prisma.dispatch.count({
        where: { ...whereClause, gatePassId: null }
      })
    };
  }

  // ==========================================
  // INVENTORY DEDUCTION
  // ==========================================
  async getInventoryDeductions(plantId: string) {
    const whereClause = plantId === 'all' ? {} : { plantId };
    return this.prisma.stockLedger.findMany({
      where: { ...whereClause, transaction: 'OUT' },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to recent 50 for dashboard
    });
  }

  // ==========================================
  // FINANCE
  // ==========================================
  async getFinanceOverview(plantId: string) {
    const whereClause = plantId === 'all' ? {} : { plantId };
    
    const ledgers = await this.prisma.financeTransaction.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysSales = ledgers
      .filter(l => l.transactionType === 'SALE' && l.date >= today)
      .reduce((acc, curr) => acc + curr.totalAmount, 0);

    const todaysCollection = ledgers
      .filter(l => l.transactionType === 'RECEIPT' && l.date >= today)
      .reduce((acc, curr) => acc + curr.paidAmount, 0);

    const totalSales = ledgers
      .filter(l => l.transactionType === 'SALE')
      .reduce((acc, curr) => acc + curr.totalAmount, 0);

    const totalCollection = ledgers
      .filter(l => l.transactionType === 'RECEIPT')
      .reduce((acc, curr) => acc + curr.paidAmount, 0);

    const pendingInvoices = ledgers.filter(l => l.transactionType === 'SALE' && l.paymentStatus === 'UNPAID').length;

    return {
      todaysSales,
      todaysCollection,
      outstandingAmount: totalSales - totalCollection,
      pendingInvoices,
      recentTransactions: ledgers.slice(0, 5) // Send top 5 most recent for the UI
    };
  }

  // ==========================================
  // UTILITIES
  // ==========================================
  async getSystemUtilities(plantId: string) {
    const whereClause = plantId === 'all' ? {} : { plantId };
    let utility = await this.prisma.systemUtility.findFirst({
      where: whereClause
    });

    if (!utility && plantId !== 'all') {
      utility = await this.prisma.systemUtility.create({
        data: { plantId }
      });
    }

    // Generate real-ish data
    const uptimeInSeconds = os.uptime();
    const days = Math.floor(uptimeInSeconds / (3600 * 24));
    const hours = Math.floor((uptimeInSeconds % (3600 * 24)) / 3600);
    const systemUptime = `${days} Days ${hours} Hrs`;

    // Real DB size from PostgreSQL
    const sizeResult: any = await this.prisma.$queryRaw`SELECT pg_database_size(current_database()) as size`;
    const bytes = sizeResult[0]?.size ? Number(sizeResult[0].size) : 0;
    
    let dbSizeFormatted = '0 MB';
    if (bytes > 1024 * 1024 * 1024) {
      dbSizeFormatted = (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    } else {
      dbSizeFormatted = (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    return {
      powerStatus: utility?.powerStatus || 'Normal',
      lastBackup: utility?.lastBackup || new Date(),
      databaseSize: dbSizeFormatted,
      systemUptime
    };
  }
}
