/**
 * Feedback 28 / 29 — Finance demo seed
 *
 * Seeds the REAL data sources the UI reads from (not fake dropdown-only stubs):
 *
 *  Add Soda dropdowns
 *  ─────────────────
 *  Mill  → Plant
 *  Item  → Product
 *  Party → FinanceParty  OR  Plant (inter-mill / Shift)
 *
 *  Sale / Purchase Report rows
 *  ──────────────────────────
 *  FinanceSoda (+ FinanceSodaMill)
 *       ↓  supervisor cuts non-draft Gate Pass with financeSodaId
 *  GatePass (OUTWARD=Sale, INWARD=Purchase) + billNo + bagTypeGp + weights
 *       ↓  sync creates
 *  FinanceSalePurchaseLine (Section H serial, A–AA)
 *       ↓  sum of Net Payment (Y)
 *  FinanceSoda.paymentAmount (Soda Report Section K)
 *
 * Run (from backend/):
 *   npx ts-node prisma/seed-finance.ts
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SEED_TAG = '[SEED_FINANCE]';

function oilAfterCut(oil: number): number {
  const A = oil - 1;
  return A > 15 ? (A - 15) / 2 + 15 : A;
}

async function upsertPlant(code: string, name: string, location: string) {
  return prisma.plant.upsert({
    where: { code },
    update: { name, location, deletedAt: null },
    create: { code, name, location },
  });
}

async function upsertProduct(name: string, type = 'OPERATIONAL') {
  const existing = await prisma.product.findUnique({ where: { name } });
  if (existing) return existing;
  return prisma.product.create({
    data: {
      name,
      type,
      category: 'OPERATIONAL',
      quantityFormat: 'QTL',
    },
  });
}

async function upsertParty(name: string, firmName?: string) {
  const existing = await prisma.financeParty.findFirst({
    where: { name, isActive: true },
  });
  if (existing) return existing;
  return prisma.financeParty.create({
    data: { name, firmName: firmName || name, contact: '9999999999' },
  });
}

async function nextSodaNumber(sodaType: 'SALE' | 'PURCHASE') {
  const last = await prisma.financeSoda.findFirst({
    where: { sodaType },
    orderBy: { sodaNumber: 'desc' },
    select: { sodaNumber: true },
  });
  return (last?.sodaNumber || 0) + 1;
}

async function ensureAdminPlantAccess(plantIds: string[]) {
  const admin = await prisma.user.findFirst({
    where: { OR: [{ username: 'superadmin' }, { email: 'admin@ricefield.com' }] },
  });
  if (!admin) {
    console.warn('⚠ No superadmin user — skip plant access mapping');
    return;
  }
  for (const plantId of plantIds) {
    await prisma.userPlantAccess.upsert({
      where: { userId_plantId: { userId: admin.id, plantId } },
      update: {},
      create: { userId: admin.id, plantId },
    });
  }
}

async function wipePreviousSeed() {
  const seedSodas = await prisma.financeSoda.findMany({
    where: { note: { contains: SEED_TAG } },
    select: { id: true },
  });
  const sodaIds = seedSodas.map((s) => s.id);
  if (!sodaIds.length) return;

  const gps = await prisma.gatePass.findMany({
    where: { financeSodaId: { in: sodaIds } },
    select: { id: true },
  });
  const gpIds = gps.map((g) => g.id);

  if (gpIds.length) {
    await prisma.financeSalePurchaseLine.deleteMany({ where: { gatePassId: { in: gpIds } } });
    await prisma.gatePassItem.deleteMany({ where: { gatePassId: { in: gpIds } } });
    await prisma.gatePass.deleteMany({ where: { id: { in: gpIds } } });
  }
  await prisma.financeLedgerEntry.deleteMany({ where: { financeSodaId: { in: sodaIds } } });
  await prisma.financeSalePurchaseLine.deleteMany({ where: { financeSodaId: { in: sodaIds } } });
  await prisma.financePaymentStatusAudit.deleteMany({ where: { financeSodaId: { in: sodaIds } } });
  await prisma.financeSodaMill.deleteMany({ where: { sodaId: { in: sodaIds } } });
  // Clear mirror links first
  await prisma.financeSoda.updateMany({
    where: { id: { in: sodaIds } },
    data: { mirrorSodaId: null },
  });
  await prisma.financeSoda.deleteMany({ where: { id: { in: sodaIds } } });
  console.log(`🧹 Cleared previous ${SEED_TAG} sodas/GPs/report lines`);
}

async function createSoda(opts: {
  sodaType: 'SALE' | 'PURCHASE';
  date: Date;
  itemId: string;
  partyId?: string | null;
  partyPlantId?: string | null;
  rate?: number | null;
  isShift?: boolean;
  quantity: number;
  millIds: string[];
  note: string;
  paymentStatus?: string;
}) {
  const sodaNumber = await nextSodaNumber(opts.sodaType);
  return prisma.financeSoda.create({
    data: {
      sodaType: opts.sodaType,
      sodaNumber,
      date: opts.date,
      itemId: opts.itemId,
      partyId: opts.partyId || null,
      partyPlantId: opts.partyPlantId || null,
      rate: opts.isShift ? null : opts.rate ?? null,
      isShift: !!opts.isShift,
      quantity: opts.quantity,
      note: opts.note,
      paymentStatus: opts.paymentStatus || 'NOT_CLEAR',
      paymentAmount: 0,
      mills: { create: opts.millIds.map((plantId) => ({ plantId })) },
    },
  });
}

async function createGp(opts: {
  plantId: string;
  passType: 'INWARD' | 'OUTWARD';
  financeSodaId: string;
  sodaNumber: number;
  vehicleNo: string;
  billNo: string;
  bagTypeGp: 'PLASTIC' | 'JUTE';
  bags: number;
  netWeight: number;
  ntWtParty: number;
  material: string;
  createdAt: Date;
}) {
  const year = opts.createdAt.getFullYear();
  const prefix = opts.passType === 'INWARD' ? 'GIN' : 'GOUT';
  // Unique qr across DB
  const seq = `${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 90 + 10)}`;
  const qrCode = `${prefix}-${year}-S${seq}`;

  return prisma.gatePass.create({
    data: {
      plantId: opts.plantId,
      passType: opts.passType,
      vehicleNo: opts.vehicleNo,
      vehicleType: 'TRUCK',
      purpose: opts.passType === 'OUTWARD' ? 'DISPATCH' : 'PURCHASE_IN',
      material: opts.material,
      driverName: 'Seed Driver',
      noOfBags: opts.bags,
      mainBags: opts.bags,
      shortageBags: 0,
      netWeight: opts.netWeight,
      ntWtParty: opts.ntWtParty,
      weighbridgeActive: true,
      status: 'ACTIVE',
      isDraft: false,
      qrCode,
      financeSodaId: opts.financeSodaId,
      sodaNo: String(opts.sodaNumber),
      billNo: opts.billNo,
      billNoNA: false,
      bagTypeGp: opts.bagTypeGp,
      gpStartDate: opts.createdAt,
      createdAt: opts.createdAt,
      remarks: `${SEED_TAG} demo GP`,
      items: {
        create: [
          {
            itemName: opts.material,
            unit: 'Bags',
            quantity: opts.bags,
          },
        ],
      },
    },
  });
}

async function createReportLine(opts: {
  reportType: 'SALE' | 'PURCHASE';
  plantId: string;
  financeSodaId: string;
  gatePassId: string;
  serialNo: number;
  oilResult?: number | null;
  cdPercent?: number;
  bagWeightConsideration?: boolean;
  note?: string;
}) {
  return prisma.financeSalePurchaseLine.create({
    data: {
      reportType: opts.reportType,
      plantId: opts.plantId,
      financeSodaId: opts.financeSodaId,
      gatePassId: opts.gatePassId,
      serialNo: opts.serialNo,
      oilResult: opts.oilResult ?? null,
      cdPercent: opts.cdPercent ?? 0,
      bagWeightConsideration: opts.bagWeightConsideration ?? false,
      note: opts.note || SEED_TAG,
    },
  });
}

async function resyncSodaK(financeSodaId: string) {
  const lines = await prisma.financeSalePurchaseLine.findMany({
    where: { financeSodaId },
    include: {
      gatePass: true,
      financeSoda: { include: { item: true } },
    },
  });

  let total = 0;
  for (const line of lines) {
    const soda = line.financeSoda;
    const gp = line.gatePass;
    const bags = ((gp.mainBags || 0) + (gp.shortageBags || 0)) || gp.noOfBags || 0;
    const bagType = String(gp.bagTypeGp || '').toUpperCase();
    const bagConst = bagType === 'PLASTIC' ? 0.002 : bagType === 'JUTE' ? 0.01 : 0;
    const tare = line.bagWeightConsideration ? bags * bagConst : 0;
    const mill = Math.max(0, (gp.netWeight || 0) - tare);
    const party = Math.max(0, (gp.ntWtParty || 0) - tare);
    const lower = Math.min(mill, party);
    const rateD = soda.isShift ? null : soda.rate;
    const itemName = soda.item?.name || '';
    const isBran = /bran/i.test(itemName);
    let rateV = rateD;
    if (isBran && line.oilResult != null && rateD != null) {
      rateV = oilAfterCut(line.oilResult) * rateD;
    }
    if (rateV == null) continue;
    const bill = rateV * lower;
    const net = bill - bill * ((line.cdPercent || 0) / 100);
    total += Math.round(net * 1000) / 1000;
  }

  await prisma.financeSoda.update({
    where: { id: financeSodaId },
    data: { paymentAmount: Math.round(total * 1000) / 1000 },
  });
}

/** Feedback 31 — mirror Section Y into FinanceLedgerEntry for seeded lines */
async function syncSeedLedger() {
  const lines = await prisma.financeSalePurchaseLine.findMany({
    where: { financeSoda: { note: { contains: SEED_TAG } } },
    include: {
      gatePass: true,
      financeSoda: true,
    },
  });
  let synced = 0;
  for (const line of lines) {
    const soda = line.financeSoda;
    const gp = line.gatePass;
    if (!soda || !gp) continue;
    const bags = ((gp.mainBags || 0) + (gp.shortageBags || 0)) || gp.noOfBags || 0;
    const bagType = String(gp.bagTypeGp || '').toUpperCase();
    const bagConst = bagType === 'PLASTIC' ? 0.002 : bagType === 'JUTE' ? 0.01 : 0;
    const tare = line.bagWeightConsideration ? bags * bagConst : 0;
    const mill = Math.max(0, (gp.netWeight || 0) - tare);
    const party = Math.max(0, (gp.ntWtParty || 0) - tare);
    const lower = Math.min(mill, party);
    const rateD = soda.isShift ? null : soda.rate;
    let rateV = rateD;
    if (line.oilResult != null && rateD != null) {
      rateV = oilAfterCut(line.oilResult) * rateD;
    }
    const bill = rateV != null ? rateV * lower : 0;
    const net = Math.round((bill - bill * ((line.cdPercent || 0) / 100)) * 1000) / 1000;
    const isSale = line.reportType === 'SALE';
    const sodaLabel = `${isSale ? 'SO' : 'PO'}-${String(soda.sodaNumber).padStart(2, '0')}`;
    await prisma.financeLedgerEntry.upsert({
      where: { salePurchaseLineId: line.id },
      create: {
        date: gp.gpStartDate || gp.createdAt || soda.date,
        entryType: isSale ? 'SALE' : 'PURCHASE',
        partyId: soda.partyId,
        partyPlantId: soda.partyPlantId,
        financeSodaId: soda.id,
        salePurchaseLineId: line.id,
        plantId: line.plantId,
        narration: `Soda No. ${sodaLabel} · GP ${gp.qrCode}`,
        debit: isSale ? net : 0,
        credit: isSale ? 0 : net,
      },
      update: {
        date: gp.gpStartDate || gp.createdAt || soda.date,
        narration: `Soda No. ${sodaLabel} · GP ${gp.qrCode}`,
        debit: isSale ? net : 0,
        credit: isSale ? 0 : net,
        partyId: soda.partyId,
        partyPlantId: soda.partyPlantId,
        plantId: line.plantId,
      },
    });
    synced += 1;
  }
  console.log(`📒 F31 ledger synced for ${synced} report line(s)`);
}

async function main() {
  console.log('🌱 Seeding Finance F28/F29/F31 demo flow...\n');

  await wipePreviousSeed();

  // ── 1. Mills (Add Soda → Mill Selection) ─────────────────────────────────
  console.log('1) Plants (mills)...');
  const goyal = await upsertPlant('GOYAL', 'Goyal Agro', 'Goyal');
  const beas = await upsertPlant('BEAS', 'Beas Agro', 'Beas');
  const rajoa = await upsertPlant('RAJOA', 'Rajoa Agro', 'Rajoa');
  await ensureAdminPlantAccess([goyal.id, beas.id, rajoa.id]);

  // ── 2. Items (Add Soda → Item Selection) ─────────────────────────────────
  console.log('2) Products (items)...');
  const riceBroken = await upsertProduct('Rice Broken');
  const riceBran = await upsertProduct('Rice Bran');
  const husk = await upsertProduct('Husk');

  // ── 3. Parties (Add Soda → Client / Party) ───────────────────────────────
  console.log('3) Finance parties...');
  const sanjay = await upsertParty('Sanjay', 'Sanjay Traders');
  const uppal = await upsertParty('Uppal', 'Uppal Agro');
  const fci = await upsertParty('FCI Store', 'FCI');

  const today = new Date();
  today.setHours(10, 0, 0, 0);
  const t1 = new Date(today);
  t1.setHours(10, 0, 0, 0);
  const t2 = new Date(today);
  t2.setHours(11, 30, 0, 0);
  const t3 = new Date(today);
  t3.setHours(14, 0, 0, 0);

  // ── 4. Sale soda — Rice Bran @ Goyal, party Sanjay (numeric rate) ────────
  console.log('4) Sale soda (Rice Bran) + multi-mill GPs → Sale Report...');
  const saleBran = await createSoda({
    sodaType: 'SALE',
    date: today,
    itemId: riceBran.id,
    partyId: sanjay.id,
    rate: 150,
    quantity: 3,
    millIds: [goyal.id, beas.id, rajoa.id],
    note: `${SEED_TAG} Sale Rice Bran qty 3 multi-mill`,
    paymentStatus: 'UNDERWAY',
  });

  // Cross-mill Section H: Beas 01 → Goyal 02 → Rajoa 03
  const gp1 = await createGp({
    plantId: beas.id,
    passType: 'OUTWARD',
    financeSodaId: saleBran.id,
    sodaNumber: saleBran.sodaNumber,
    vehicleNo: 'PB10SEED01',
    billNo: 'BILL-S-001',
    bagTypeGp: 'PLASTIC',
    bags: 500,
    netWeight: 500,
    ntWtParty: 495,
    material: 'Rice Bran',
    createdAt: t1,
  });
  await createReportLine({
    reportType: 'SALE',
    plantId: beas.id,
    financeSodaId: saleBran.id,
    gatePassId: gp1.id,
    serialNo: 1,
    oilResult: 18.5,
    cdPercent: 1,
    bagWeightConsideration: true,
    note: `${SEED_TAG} H=01 Beas`,
  });

  const gp2 = await createGp({
    plantId: goyal.id,
    passType: 'OUTWARD',
    financeSodaId: saleBran.id,
    sodaNumber: saleBran.sodaNumber,
    vehicleNo: 'PB10SEED02',
    billNo: 'BILL-S-002',
    bagTypeGp: 'JUTE',
    bags: 400,
    netWeight: 480,
    ntWtParty: 485,
    material: 'Rice Bran',
    createdAt: t2,
  });
  await createReportLine({
    reportType: 'SALE',
    plantId: goyal.id,
    financeSodaId: saleBran.id,
    gatePassId: gp2.id,
    serialNo: 2,
    oilResult: 18.5,
    cdPercent: 1.5,
    bagWeightConsideration: false,
    note: `${SEED_TAG} H=02 Goyal`,
  });

  const gp3 = await createGp({
    plantId: rajoa.id,
    passType: 'OUTWARD',
    financeSodaId: saleBran.id,
    sodaNumber: saleBran.sodaNumber,
    vehicleNo: 'PB10SEED03',
    billNo: 'BILL-S-003',
    bagTypeGp: 'PLASTIC',
    bags: 450,
    netWeight: 500,
    ntWtParty: 500,
    material: 'Rice Bran',
    createdAt: t3,
  });
  await createReportLine({
    reportType: 'SALE',
    plantId: rajoa.id,
    financeSodaId: saleBran.id,
    gatePassId: gp3.id,
    serialNo: 3,
    oilResult: 14,
    cdPercent: 0,
    note: `${SEED_TAG} H=03 Rajoa`,
  });
  await resyncSodaK(saleBran.id);

  // ── 5. Purchase soda — Husk @ Goyal, party Uppal ─────────────────────────
  console.log('5) Purchase soda (Husk) + GP In → Purchase Report...');
  const purchaseHusk = await createSoda({
    sodaType: 'PURCHASE',
    date: today,
    itemId: husk.id,
    partyId: uppal.id,
    rate: 120,
    quantity: 2,
    millIds: [goyal.id],
    note: `${SEED_TAG} Purchase Husk qty 2`,
    paymentStatus: 'NOT_CLEAR',
  });

  const gpIn = await createGp({
    plantId: goyal.id,
    passType: 'INWARD',
    financeSodaId: purchaseHusk.id,
    sodaNumber: purchaseHusk.sodaNumber,
    vehicleNo: 'PB10SEEDIN1',
    billNo: 'BILL-P-001',
    bagTypeGp: 'JUTE',
    bags: 300,
    netWeight: 310,
    ntWtParty: 308,
    material: 'Husk',
    createdAt: t1,
  });
  await createReportLine({
    reportType: 'PURCHASE',
    plantId: goyal.id,
    financeSodaId: purchaseHusk.id,
    gatePassId: gpIn.id,
    serialNo: 1,
    cdPercent: 0.5,
    note: `${SEED_TAG} Purchase H=01`,
  });
  await resyncSodaK(purchaseHusk.id);

  // ── 6. Shift case study — Sale Goyal ↔ Purchase Beas (Rice Broken) ───────
  console.log('6) Shift mirror case study (Goyal Sale ↔ Beas Purchase)...');
  const saleShift = await createSoda({
    sodaType: 'SALE',
    date: today,
    itemId: riceBroken.id,
    partyPlantId: beas.id,
    isShift: true,
    quantity: 3,
    millIds: [goyal.id],
    note: `${SEED_TAG} Shift Sale Goyal→Beas`,
  });
  const purchaseShift = await createSoda({
    sodaType: 'PURCHASE',
    date: today,
    itemId: riceBroken.id,
    partyPlantId: goyal.id,
    isShift: true,
    quantity: 3,
    millIds: [beas.id],
    note: `${SEED_TAG} Shift Purchase Beas←Goyal`,
  });
  await prisma.financeSoda.update({
    where: { id: saleShift.id },
    data: { mirrorSodaId: purchaseShift.id },
  });
  await prisma.financeSoda.update({
    where: { id: purchaseShift.id },
    data: { mirrorSodaId: saleShift.id },
  });

  // Open quota remaining on Shift sodas (no GP yet) so Add Soda / GP dropdowns show them
  const openSale = await createSoda({
    sodaType: 'SALE',
    date: today,
    itemId: husk.id,
    partyId: fci.id,
    rate: 95,
    quantity: 5,
    millIds: [goyal.id],
    note: `${SEED_TAG} Open Sale Husk (available for GP Out)`,
  });

  console.log('\n✅ Finance seed complete\n');
  console.log('────────────────────────────────────────────────');
  console.log('DROPDOWNS (Add Soda)');
  console.log('  Mills : Goyal Agro, Beas Agro, Rajoa Agro');
  console.log('  Items : Rice Broken, Rice Bran, Husk');
  console.log('  Party : Sanjay, Uppal, FCI Store  (+ mills if Party type = Mill)');
  console.log('');
  console.log('SODA REPORTS');
  console.log(`  Sale #${saleBran.sodaNumber} Rice Bran — Completed 3/3 (multi-mill)  K synced`);
  console.log(`  Sale #${saleShift.sodaNumber} Rice Broken — Shift (open)`);
  console.log(`  Sale #${openSale.sodaNumber} Husk — open for GP Out @ Goyal`);
  console.log(`  Purchase #${purchaseHusk.sodaNumber} Husk — 1/2 @ Goyal`);
  console.log(`  Purchase #${purchaseShift.sodaNumber} Rice Broken — Shift (open)`);
  console.log('');

  await syncSeedLedger();

  console.log('SALE / PURCHASE REPORT');
  console.log('  Finance → Sale     → filter mill / All mills (3 Bran lines H=01..03)');
  console.log('  Finance → Purchase → Goyal (1 Husk line)');
  console.log('');
  console.log('LEDGER (F31)');
  console.log('  Finance → Receivables / Payables / Payment Received / Payment Paid');
  console.log('');
  console.log('NEXT MANUAL STEP (dynamic flow)');
  console.log('  1. Finance → Deals / Soda → Add Soda (dropdowns populated)');
  console.log('  2. Gate Pass OUT @ Goyal → pick open Sale soda → submit (not Draft)');
  console.log('  3. Finance → Sale Report → new row + Section H next serial');
  console.log('────────────────────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error('❌ Finance seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
