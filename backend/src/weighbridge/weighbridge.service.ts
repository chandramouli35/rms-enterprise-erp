import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WeighbridgeService {
  constructor(private prisma: PrismaService) {}

  async streamWeight(vehicleNo: string) {
    // Prefer real weights already punched on an active INWARD gate pass
    const activePass = await this.prisma.gatePass.findFirst({
      where: {
        OR: [
          { vehicleNo: { equals: vehicleNo, mode: 'insensitive' } },
          { vehicleNo: { equals: String(vehicleNo || '').trim(), mode: 'insensitive' } },
        ],
        status: 'ACTIVE',
        passType: 'INWARD',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activePass) {
      throw new NotFoundException(`No active INWARD gate pass found for vehicle ${vehicleNo}`);
    }

    const gross = activePass.grossWeight;
    const tare = activePass.tareWeight;
    const net =
      activePass.netWeight ??
      (gross != null && tare != null ? Number(gross) - Number(tare) : null);

    if (gross == null && tare == null && net == null) {
      throw new NotFoundException(
        `Active GP found for ${vehicleNo} but weighbridge weights are not punched yet. Complete weighbridge punching first.`,
      );
    }

    return {
      vehicleNo: activePass.vehicleNo || vehicleNo,
      grossWeight: gross,
      tareWeight: tare,
      netWeight: net,
      status: 'Stable',
      timestamp: new Date(),
      source: 'gate_pass',
    };
  }

  async saveTransaction(data: any) {
    const { 
      plantId, vehicleNo, grossWeight, tareWeight, netWeight,
      transactionType, driverName, materialType, supplierName, challanNo, remarks, gatePassId
    } = data;
    
    let resolvedGatePassId: string | null = null;
    if (gatePassId) {
      const gp = await this.prisma.gatePass.findFirst({
        where: { qrCode: gatePassId, plantId }
      });
      if (gp) {
        resolvedGatePassId = gp.id;
        // Update Gate Pass with Supervisor details
        await this.prisma.gatePass.update({
          where: { id: resolvedGatePassId },
          data: {
            sodaPendingId: data.sodaPendingId,
            qualityCutType: data.qualityCutType,
            qualityCutValue: data.qualityCutValue,
            qualityCutReason: data.qualityCutReason,
            noOfBags: data.bagsReceived
          }
        });
      }
    }
    
    const transaction = await this.prisma.weighbridgeTransaction.create({
      data: {
        plantId,
        vehicleNo,
        transactionType,
        driverName,
        materialType,
        supplierName,
        challanNo,
        remarks,
        gatePassId: resolvedGatePassId,
        grossWeight,
        tareWeight,
        netWeight,
        grossTime: new Date(),
        status: 'COMPLETED'
      }
    });

    return transaction;
  }

  async getHistory(plantId: string) {
    const whereClause = plantId === 'global' ? {} : { plantId };
    return this.prisma.weighbridgeTransaction.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 100 // Limit to recent 100 for now, or add pagination
    });
  }

  /** Feedback 33 — latest completed weighbridge reading for a truck (fallback: live stream gross) */
  async getLatestForVehicle(plantId: string, vehicleNo: string) {
    const cleaned = String(vehicleNo || '').trim();
    if (!cleaned) return null;

    const tx = await this.prisma.weighbridgeTransaction.findFirst({
      where: {
        ...(plantId && plantId !== 'global' ? { plantId } : {}),
        vehicleNo: { equals: cleaned, mode: 'insensitive' },
        status: 'COMPLETED',
      },
      orderBy: { createdAt: 'desc' },
    });
    if (tx) {
      const net =
        tx.netWeight ??
        (tx.grossWeight != null && tx.tareWeight != null
          ? tx.grossWeight - tx.tareWeight
          : null);
      return {
        vehicleNo: tx.vehicleNo,
        grossWeight: tx.grossWeight,
        tareWeight: tx.tareWeight,
        netWeight: net,
        source: 'weighbridge_transaction',
      };
    }

    try {
      const stream = await this.streamWeight(cleaned);
      return {
        vehicleNo: stream.vehicleNo,
        grossWeight: stream.grossWeight,
        tareWeight: stream.tareWeight ?? null,
        netWeight: stream.netWeight ?? null,
        source: stream.source || 'gate_pass',
      };
    } catch {
      return null;
    }
  }

  async getSettings(plantId: string) {
    const whereClause = plantId === 'global' ? {} : { plantId };
    let settings = await this.prisma.weighbridgeSettings.findFirst({
      where: whereClause
    });
    
    if (!settings && plantId !== 'global') {
      settings = await this.prisma.weighbridgeSettings.create({
        data: { plantId }
      });
    }
    return settings;
  }

  /**
   * Physical weighbridge indicator status.
   * Until a COM/serial bridge is running and reporting live, status stays disconnected.
   */
  async getConnectionStatus(plantId: string) {
    const settings = await this.getSettings(plantId);
    // No serial bridge / hardware agent is wired yet — never report Connected falsely.
    return {
      connected: false,
      status: 'Not Connected',
      message:
        'Physical weighbridge indicator is not connected. Connect the device via COM port and confirm weight in PuTTY before live capture.',
      port: settings?.port || null,
      baudRate: settings?.baudRate || null,
      indicatorModel: settings?.indicatorModel || null,
      connectionType: settings?.connectionType || null,
      dataBits: settings?.dataBits || null,
      stopBits: settings?.stopBits || null,
      parity: settings?.parity || null,
      checkedAt: new Date().toISOString(),
    };
  }

  async updateSettings(plantId: string, data: any) {
    return this.prisma.weighbridgeSettings.upsert({
      where: { plantId },
      update: data,
      create: { plantId, ...data }
    });
  }
}