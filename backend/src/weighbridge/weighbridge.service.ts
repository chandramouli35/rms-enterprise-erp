import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Live reading pushed by the Windows COM Bridge (in-memory; plant-scoped). */
type LiveReading = {
  weightKg: number;
  at: Date;
  port?: string;
  baudRate?: string | number;
  stable?: boolean;
  raw?: string;
};

/** Consider connected if Bridge posted within this window. */
const BRIDGE_HEARTBEAT_MS = 12_000;

@Injectable()
export class WeighbridgeService {
  private readonly liveByPlant = new Map<string, LiveReading>();

  constructor(private prisma: PrismaService) {}

  private assertBridgeKey(bridgeKey?: string) {
    const expected = process.env.WEIGHBRIDGE_BRIDGE_SECRET;
    if (!expected) return; // open when secret not configured
    if (!bridgeKey || bridgeKey !== expected) {
      throw new UnauthorizedException(
        'Invalid or missing weighbridge bridge key (X-Bridge-Key).',
      );
    }
  }

  /**
   * Push live indicator kg for a plant.
   * @param requireBridgeAuth — true for Node bridge-ingest route
   */
  ingestLiveWeight(
    plantId: string,
    body: {
      weightKg?: number;
      weight?: number;
      port?: string;
      baudRate?: string | number;
      stable?: boolean;
      raw?: string;
      bridgeKey?: string;
    },
    headerKey?: string,
    requireBridgeAuth = false,
  ) {
    if (requireBridgeAuth) {
      this.assertBridgeKey(headerKey || body?.bridgeKey);
    }
    if (!plantId || plantId === 'global') {
      throw new BadRequestException('plantId is required for live weighbridge ingest.');
    }
    const weightKg = Number(body?.weightKg ?? body?.weight);
    if (!Number.isFinite(weightKg) || weightKg < 0) {
      throw new BadRequestException('weightKg must be a non-negative number.');
    }
    const reading: LiveReading = {
      weightKg,
      at: new Date(),
      port: body?.port,
      baudRate: body?.baudRate,
      stable: body?.stable !== false,
      raw: body?.raw != null ? String(body.raw).slice(0, 120) : undefined,
    };
    this.liveByPlant.set(plantId, reading);
    return {
      ok: true,
      plantId,
      weightKg: reading.weightKg,
      at: reading.at.toISOString(),
      connected: true,
    };
  }

  /** Latest live kg from COM Bridge (null if never posted / stale). */
  getLiveWeight(plantId: string, maxAgeMs = BRIDGE_HEARTBEAT_MS) {
    const reading = this.liveByPlant.get(plantId);
    if (!reading) {
      return {
        connected: false,
        weightKg: null,
        ageMs: null,
        at: null,
        message: 'No live weight yet. On the weighbridge PC open Capture and click Connect Indicator (Chrome/Edge).',
      };
    }
    const ageMs = Date.now() - reading.at.getTime();
    const connected = ageMs <= maxAgeMs;
    return {
      connected,
      weightKg: reading.weightKg,
      ageMs,
      at: reading.at.toISOString(),
      port: reading.port ?? null,
      baudRate: reading.baudRate ?? null,
      stable: reading.stable ?? true,
      raw: reading.raw ?? null,
      message: connected
        ? 'Live weight from COM Bridge.'
        : 'COM Bridge heartbeat timed out. Is the bridge still running?',
    };
  }

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
   * Connected only while the COM Bridge is posting live heartbeats for this plant.
   */
  async getConnectionStatus(plantId: string) {
    const settings = await this.getSettings(plantId);
    const live = this.getLiveWeight(plantId);
    const connected = !!live.connected;
    return {
      connected,
      status: connected ? 'Connected' : 'Not Connected',
      message: connected
        ? `Physical weighbridge live on ${live.port || settings?.port || 'COM'} @ ${live.baudRate || settings?.baudRate || '-'} baud.`
        : live.message ||
          'Indicator not connected. On this PC use Chrome/Edge → Weighbridge → Capture → Connect Indicator.',
      weightKg: connected ? live.weightKg : null,
      liveAt: live.at,
      port: live.port || settings?.port || null,
      baudRate: live.baudRate || settings?.baudRate || null,
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