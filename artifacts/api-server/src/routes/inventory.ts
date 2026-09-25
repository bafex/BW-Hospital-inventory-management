import { Router, type IRouter } from "express";
import { and, asc, desc, eq, gt, lte, sql } from "drizzle-orm";
import {
  db,
  auditLogsTable,
  batchesTable,
  chronicSchedulesTable,
  medicinesTable,
  replenishmentsTable,
  stockTransactionsTable,
} from "@workspace/db";
import {
  AdjustStockBody,
  CreateChronicScheduleBody,
  CreateMedicineBody,
  DispenseStockBody,
  ReceiveStockBody,
  SubmitReplenishmentBody,
  UpdateMedicineBody,
  UpdateMedicineParams,
} from "@workspace/api-zod";

const router: IRouter = Router();
const today = () => new Date().toISOString().slice(0, 10);
let seedPromise: Promise<void> | null = null;

async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      const existing = await db.select({ id: medicinesTable.id }).from(medicinesTable).limit(1);
      if (existing.length > 0) return;

      const meds = await db
        .insert(medicinesTable)
        .values([
          { name: "Amoxicillin", genericName: "Amoxicillin", strength: "500 mg", form: "Capsule", category: "Antibiotics", minStock: 800, packSize: 100 },
          { name: "Metformin", genericName: "Metformin Hydrochloride", strength: "500 mg", form: "Tablet", category: "Chronic Medicines", minStock: 1200, packSize: 100 },
          { name: "Amlodipine", genericName: "Amlodipine", strength: "5 mg", form: "Tablet", category: "Cardiovascular", minStock: 900, packSize: 100 },
          { name: "Paracetamol", genericName: "Paracetamol", strength: "500 mg", form: "Tablet", category: "Analgesics", minStock: 1500, packSize: 100 },
          { name: "Insulin human", genericName: "Human insulin", strength: "100 IU/ml", form: "Vial", category: "Chronic Medicines", minStock: 120, packSize: 10 },
          { name: "Ceftriaxone", genericName: "Ceftriaxone", strength: "1 g", form: "Vial", category: "Antibiotics", minStock: 100, packSize: 10 },
          { name: "Omeprazole", genericName: "Omeprazole", strength: "20 mg", form: "Capsule", category: "Gastrointestinal", minStock: 700, packSize: 100 },
          { name: "Salbutamol", genericName: "Salbutamol", strength: "100 mcg", form: "Inhaler", category: "Respiratory", minStock: 180, packSize: 10 },
        ])
        .returning();

      await db.insert(batchesTable).values([
        { medicineId: meds[0].id, batchNumber: "AMX-25-041", supplier: "CMS Botswana", packSize: 100, quantityReceived: 2400, unitsRemaining: 640, expiryDate: "2027-04-30" },
        { medicineId: meds[1].id, batchNumber: "MTF-25-009", supplier: "CMS Botswana", packSize: 100, quantityReceived: 3000, unitsRemaining: 1840, expiryDate: "2027-09-30" },
        { medicineId: meds[2].id, batchNumber: "AML-25-112", supplier: "CMS Botswana", packSize: 100, quantityReceived: 1800, unitsRemaining: 760, expiryDate: "2026-12-15" },
        { medicineId: meds[3].id, batchNumber: "PCM-25-089", supplier: "CMS Botswana", packSize: 100, quantityReceived: 5000, unitsRemaining: 2950, expiryDate: "2028-01-31" },
        { medicineId: meds[4].id, batchNumber: "INS-26-007", supplier: "CMS Botswana", packSize: 10, quantityReceived: 300, unitsRemaining: 86, expiryDate: "2026-11-12" },
        { medicineId: meds[5].id, batchNumber: "CTX-26-014", supplier: "CMS Botswana", packSize: 10, quantityReceived: 300, unitsRemaining: 42, expiryDate: "2026-10-10" },
        { medicineId: meds[6].id, batchNumber: "OMP-25-033", supplier: "CMS Botswana", packSize: 100, quantityReceived: 1600, unitsRemaining: 522, expiryDate: "2027-02-28" },
        { medicineId: meds[7].id, batchNumber: "SLB-26-002", supplier: "CMS Botswana", packSize: 10, quantityReceived: 400, unitsRemaining: 155, expiryDate: "2026-10-06" },
      ]);

      await db.insert(stockTransactionsTable).values([
        { medicineId: meds[0].id, type: "Received", quantity: 2400, reference: "GRN-2026-0912", userName: "Naledi Molefe" },
        { medicineId: meds[1].id, type: "Issued", quantity: -420, reference: "RX-2026-4481", userName: "Dr. K. Motsumi" },
        { medicineId: meds[2].id, type: "Issued", quantity: -180, reference: "RX-2026-4473", userName: "Ofentse Rakgogo" },
        { medicineId: meds[3].id, type: "Issued", quantity: -520, reference: "RX-2026-4459", userName: "Mpho Dube" },
        { medicineId: meds[4].id, type: "Issued", quantity: -34, reference: "RX-2026-4441", userName: "Ofentse Rakgogo" },
        { medicineId: meds[5].id, type: "Issued", quantity: -18, reference: "RX-2026-4438", userName: "Mpho Dube" },
      ]);

      await db.insert(chronicSchedulesTable).values([
        { patientReference: "GDH-CH-00182", displayName: "M. Kgosidintsi", medicineId: meds[1].id, quantity: 90, intervalDays: 30, lastCollection: "2026-08-26", nextCollection: "2026-09-25" },
        { patientReference: "GDH-CH-00217", displayName: "T. Moagi", medicineId: meds[2].id, quantity: 90, intervalDays: 30, lastCollection: "2026-09-01", nextCollection: "2026-10-01" },
        { patientReference: "GDH-CH-00109", displayName: "B. Sechele", medicineId: meds[4].id, quantity: 30, intervalDays: 30, lastCollection: "2026-09-05", nextCollection: "2026-10-05" },
        { patientReference: "GDH-CH-00245", displayName: "K. Pheko", medicineId: meds[1].id, quantity: 90, intervalDays: 30, lastCollection: "2026-09-08", nextCollection: "2026-10-08" },
      ]);

      await db.insert(auditLogsTable).values([
        { action: "Stock received", userName: "Naledi Molefe", role: "Inventory Officer", description: "Received GRN-2026-0912 from CMS Botswana" },
        { action: "Medicine issued", userName: "Ofentse Rakgogo", role: "Pharmacist", description: "Dispensed Amlodipine 5 mg against RX-2026-4473" },
        { action: "Login", userName: "Ofentse Rakgogo", role: "Pharmacist", description: "Signed in from dispensary workstation" },
      ]);
    })();
  }
  await seedPromise;
}

function daysUntil(dateString: string): number {
  return Math.ceil((new Date(`${dateString}T00:00:00`).getTime() - new Date(`${today()}T00:00:00`).getTime()) / 86_400_000);
}

async function medicineRows() {
  const medicines = await db.select().from(medicinesTable).orderBy(asc(medicinesTable.name));
  const batches = await db.select().from(batchesTable).orderBy(asc(batchesTable.expiryDate));
  return medicines.map((medicine) => {
    const medicineBatches = batches.filter((batch) => batch.medicineId === medicine.id);
    const stockUnits = medicineBatches.reduce((sum, batch) => sum + batch.unitsRemaining, 0);
    const firstBatch = medicineBatches[0];
    const status = stockUnits <= medicine.minStock / 2 ? "critical" : stockUnits <= medicine.minStock ? "low" : "normal";
    return {
      id: medicine.id,
      name: medicine.name,
      genericName: medicine.genericName,
      strength: medicine.strength,
      form: medicine.form,
      category: medicine.category,
      stockUnits,
      packSize: medicine.packSize,
      minStock: medicine.minStock,
      status,
      expiryDate: firstBatch?.expiryDate ?? "—",
      batchNumber: firstBatch?.batchNumber ?? "—",
      supplier: firstBatch?.supplier ?? "—",
      lastMovement: "Today",
    };
  });
}

async function writeAudit(action: string, description: string, userName = "Ofentse Rakgogo", role = "Pharmacist") {
  await db.insert(auditLogsTable).values({ action, description, userName, role });
}

router.get("/dashboard", async (_req, res): Promise<void> => {
  await ensureSeeded();
  const medicines = await medicineRows();
  const alerts = await buildAlerts(medicines);
  const transactions = await db
    .select({ id: stockTransactionsTable.id, medicine: medicinesTable.name, type: stockTransactionsTable.type, quantity: stockTransactionsTable.quantity, createdAt: stockTransactionsTable.createdAt, user: stockTransactionsTable.userName })
    .from(stockTransactionsTable)
    .innerJoin(medicinesTable, eq(stockTransactionsTable.medicineId, medicinesTable.id))
    .orderBy(desc(stockTransactionsTable.createdAt))
    .limit(6);
  const schedules = await chronicRows();
  res.json({
    user: { name: "Ofentse Rakgogo", role: "Pharmacist / Dispensary Officer" },
    hospital: "Gaborone District Hospital",
    kpis: {
      totalMedicines: medicines.length,
      inStock: medicines.filter((medicine) => medicine.stockUnits > 0).length,
      lowStock: medicines.filter((medicine) => medicine.status === "low").length,
      expiringSoon: medicines.filter((medicine) => daysUntil(medicine.expiryDate) <= 90).length,
      criticalItems: medicines.filter((medicine) => medicine.status === "critical").length,
    },
    stockStatus: [
      { label: "Healthy stock", value: medicines.filter((medicine) => medicine.status === "normal").length },
      { label: "Low stock", value: medicines.filter((medicine) => medicine.status === "low").length },
      { label: "Critical", value: medicines.filter((medicine) => medicine.status === "critical").length },
    ],
    monthlyConsumption: [
      { month: "Apr", units: 3820 }, { month: "May", units: 4180 }, { month: "Jun", units: 3960 },
      { month: "Jul", units: 4520 }, { month: "Aug", units: 4310 }, { month: "Sep", units: 2980 },
    ],
    topConsumed: [
      { medicine: "Paracetamol 500 mg", units: 1280 }, { medicine: "Metformin 500 mg", units: 940 },
      { medicine: "Amlodipine 5 mg", units: 760 }, { medicine: "Amoxicillin 500 mg", units: 620 },
      { medicine: "Omeprazole 20 mg", units: 520 },
    ],
    recentMovements: transactions.map((transaction) => ({ id: transaction.id, medicine: transaction.medicine, type: transaction.type, quantity: Math.abs(transaction.quantity), time: transaction.createdAt.toISOString(), user: transaction.user })),
    upcomingCollections: schedules.slice(0, 4),
  });
});

router.get("/medicines", async (req, res): Promise<void> => {
  await ensureSeeded();
  const search = typeof req.query.search === "string" ? req.query.search.toLowerCase() : "";
  const status = typeof req.query.status === "string" ? req.query.status : "all";
  let rows = await medicineRows();
  if (search) rows = rows.filter((row) => `${row.name} ${row.genericName} ${row.strength}`.toLowerCase().includes(search));
  if (status !== "all") rows = rows.filter((row) => row.status === status);
  res.json(rows);
});

router.post("/medicines", async (req, res): Promise<void> => {
  await ensureSeeded();
  const parsed = CreateMedicineBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [medicine] = await db.insert(medicinesTable).values(parsed.data).returning();
  await writeAudit("Medicine created", `Added ${medicine.name} ${medicine.strength} to the catalogue`);
  res.status(201).json((await medicineRows()).find((row) => row.id === medicine.id));
});

router.patch("/medicines/:id", async (req, res): Promise<void> => {
  await ensureSeeded();
  const params = UpdateMedicineParams.safeParse(req.params);
  const body = UpdateMedicineBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid medicine update" }); return; }
  const [medicine] = await db.update(medicinesTable).set(body.data).where(eq(medicinesTable.id, params.data.id)).returning();
  if (!medicine) { res.status(404).json({ error: "Medicine not found" }); return; }
  await writeAudit("Medicine updated", `Updated ${medicine.name}`);
  res.json((await medicineRows()).find((row) => row.id === medicine.id));
});

router.post("/operations/receive", async (req, res): Promise<void> => {
  await ensureSeeded();
  const parsed = ReceiveStockBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const data = parsed.data;
  const totalUnits = data.packs * data.packSize + data.looseUnits;
  if (totalUnits <= 0 || daysUntil(data.expiryDate) < 0) { res.status(400).json({ error: "Quantity must be positive and expiry must be in the future." }); return; }
  const result = await db.transaction(async (tx) => {
    const [batch] = await tx.insert(batchesTable).values({ medicineId: data.medicineId, batchNumber: data.batchNumber, supplier: data.supplier, packSize: data.packSize, quantityReceived: totalUnits, unitsRemaining: totalUnits, expiryDate: data.expiryDate }).returning();
    const [transaction] = await tx.insert(stockTransactionsTable).values({ medicineId: data.medicineId, batchId: batch.id, type: "Received", quantity: totalUnits, reference: data.batchNumber }).returning();
    await tx.insert(auditLogsTable).values({ action: "Stock received", userName: "Ofentse Rakgogo", role: "Inventory Officer", description: `Received ${totalUnits} units in batch ${data.batchNumber}` });
    return { batch, transaction };
  });
  res.status(201).json({ message: `Received ${totalUnits} units successfully`, updatedStock: (await medicineRows()).find((row) => row.id === data.medicineId)?.stockUnits ?? totalUnits, transactionId: result.transaction.id });
});

router.post("/operations/dispense", async (req, res): Promise<void> => {
  await ensureSeeded();
  const parsed = DispenseStockBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const data = parsed.data;
  let result;
  try {
    result = await db.transaction(async (tx) => {
      const batches = await tx.select().from(batchesTable).where(and(eq(batchesTable.medicineId, data.medicineId), gt(batchesTable.unitsRemaining, 0))).orderBy(asc(batchesTable.expiryDate));
      let remaining = data.quantity;
      for (const batch of batches) {
        if (daysUntil(batch.expiryDate) < 0) continue;
        const deduction = Math.min(batch.unitsRemaining, remaining);
        if (deduction > 0) {
          await tx.update(batchesTable).set({ unitsRemaining: batch.unitsRemaining - deduction }).where(eq(batchesTable.id, batch.id));
          remaining -= deduction;
        }
        if (remaining === 0) break;
      }
      if (remaining > 0) throw new Error("Insufficient unexpired stock for this issue.");
      const [transaction] = await tx.insert(stockTransactionsTable).values({ medicineId: data.medicineId, type: "Issued", quantity: -data.quantity, reference: data.prescriptionReference, reason: data.patientReference }).returning();
      await tx.insert(auditLogsTable).values({ action: "Medicine issued", userName: "Ofentse Rakgogo", role: "Pharmacist", description: `Dispensed ${data.quantity} units against ${data.prescriptionReference}` });
      return transaction;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to dispense stock.";
    res.status(400).json({ error: message });
    return;
  }
  res.status(201).json({ message: `Dispensed ${data.quantity} units using FEFO`, updatedStock: (await medicineRows()).find((row) => row.id === data.medicineId)?.stockUnits ?? 0, transactionId: result.id });
});

router.post("/operations/adjust", async (req, res): Promise<void> => {
  await ensureSeeded();
  const parsed = AdjustStockBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const data = parsed.data;
  const batches = await db.select().from(batchesTable).where(eq(batchesTable.medicineId, data.medicineId)).orderBy(asc(batchesTable.expiryDate));
  const current = batches.reduce((sum, batch) => sum + batch.unitsRemaining, 0);
  if (current + data.quantity < 0) { res.status(400).json({ error: "Adjustment would create negative stock." }); return; }
  if (batches[0]) {
    await db.update(batchesTable).set({ unitsRemaining: batches[0].unitsRemaining + data.quantity }).where(eq(batchesTable.id, batches[0].id));
  }
  const [transaction] = await db.insert(stockTransactionsTable).values({ medicineId: data.medicineId, batchId: batches[0]?.id, type: "Adjusted", quantity: data.quantity, reason: data.reason }).returning();
  await writeAudit("Stock adjusted", data.reason, "Ofentse Rakgogo", "Administrator");
  res.status(201).json({ message: "Adjustment recorded without overwriting prior transactions", updatedStock: current + data.quantity, transactionId: transaction.id });
});

async function chronicRows() {
  const rows = await db.select({ schedule: chronicSchedulesTable, medicine: medicinesTable.name }).from(chronicSchedulesTable).innerJoin(medicinesTable, eq(chronicSchedulesTable.medicineId, medicinesTable.id)).orderBy(asc(chronicSchedulesTable.nextCollection));
  return rows.map(({ schedule, medicine }) => ({
    id: schedule.id,
    patientReference: schedule.patientReference,
    displayName: schedule.displayName,
    medicine: `${medicine} collection`,
    quantity: schedule.quantity,
    intervalDays: schedule.intervalDays,
    lastCollection: schedule.lastCollection ?? "—",
    nextCollection: schedule.nextCollection,
    status: daysUntil(schedule.nextCollection) <= 0 ? "due" : daysUntil(schedule.nextCollection) <= 7 ? "upcoming" : "scheduled",
  }));
}

router.get("/chronic-schedules", async (_req, res): Promise<void> => { await ensureSeeded(); res.json(await chronicRows()); });

router.post("/chronic-schedules", async (req, res): Promise<void> => {
  await ensureSeeded();
  const parsed = CreateChronicScheduleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [schedule] = await db.insert(chronicSchedulesTable).values(parsed.data).returning();
  await writeAudit("Chronic schedule created", `Added collection schedule for ${schedule.patientReference}`);
  res.status(201).json((await chronicRows()).find((row) => row.id === schedule.id));
});

async function buildAlerts(inputMedicines?: Awaited<ReturnType<typeof medicineRows>>) {
  const medicines = inputMedicines ?? (await medicineRows());
  const alerts: Array<{ id: number; type: "low-stock" | "critical" | "expiry" | "chronic"; severity: "warning" | "critical" | "info"; title: string; detail: string; medicine: string; time: string }> = [];
  medicines.filter((medicine) => medicine.status !== "normal").forEach((medicine) => alerts.push({ id: medicine.id, type: medicine.status === "critical" ? "critical" : "low-stock", severity: medicine.status === "critical" ? "critical" : "warning", title: medicine.status === "critical" ? "Critical stock level" : "Low stock level", detail: `${medicine.stockUnits.toLocaleString()} units remaining · minimum ${medicine.minStock.toLocaleString()}`, medicine: `${medicine.name} ${medicine.strength}`, time: "Needs review" }));
  medicines.filter((medicine) => daysUntil(medicine.expiryDate) <= 90).forEach((medicine) => alerts.push({ id: medicine.id + 100, type: "expiry", severity: daysUntil(medicine.expiryDate) <= 30 ? "critical" : "warning", title: daysUntil(medicine.expiryDate) < 0 ? "Expired batch" : "Expiring soon", detail: `${daysUntil(medicine.expiryDate)} days remaining · batch ${medicine.batchNumber}`, medicine: `${medicine.name} ${medicine.strength}`, time: medicine.expiryDate }));
  const schedules = await chronicRows();
  schedules.filter((schedule) => schedule.status === "due").forEach((schedule) => alerts.push({ id: schedule.id + 200, type: "chronic", severity: "info", title: "Chronic collection due", detail: `${schedule.displayName} · ${schedule.medicine}`, medicine: schedule.patientReference, time: "Today" }));
  return alerts;
}

router.get("/alerts", async (_req, res): Promise<void> => { await ensureSeeded(); res.json(await buildAlerts()); });

router.get("/replenishment", async (_req, res): Promise<void> => {
  await ensureSeeded();
  const medicines = await medicineRows();
  const existing = await db.select().from(replenishmentsTable).orderBy(desc(replenishmentsTable.createdAt));
  const rows = medicines.filter((medicine) => medicine.status !== "normal").map((medicine, index) => {
    const record = existing.find((item) => item.medicineId === medicine.id);
    return { id: record?.id ?? medicine.id, medicine: `${medicine.name} ${medicine.strength}`, currentStock: medicine.stockUnits, minStock: medicine.minStock, suggestedQuantity: Math.max(medicine.minStock * 2 - medicine.stockUnits, medicine.packSize), status: record?.status ?? "candidate", requestedQuantity: record?.requestedQuantity };
  });
  res.json(rows);
});

router.post("/replenishment", async (req, res): Promise<void> => {
  await ensureSeeded();
  const parsed = SubmitReplenishmentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  for (const item of parsed.data.items) {
    const medicines = await medicineRows();
    const medicine = medicines.find((row) => row.id === item.medicineId);
    if (!medicine) continue;
    await db.insert(replenishmentsTable).values({ medicineId: item.medicineId, currentStock: medicine.stockUnits, minStock: medicine.minStock, suggestedQuantity: Math.max(medicine.minStock * 2 - medicine.stockUnits, medicine.packSize), requestedQuantity: item.quantity, status: "submitted", submittedAt: new Date() });
  }
  await writeAudit("Replenishment submitted", `Submitted ${parsed.data.items.length} medicine request(s) for CMS preparation`, "Ofentse Rakgogo", "Inventory Officer");
  res.status(201).json({ message: "Replenishment request submitted for CMS preparation", updatedStock: 0 });
});

router.get("/reports/consumption", async (_req, res): Promise<void> => {
  await ensureSeeded();
  const transactions = await db.select({ medicine: medicinesTable.name, quantity: stockTransactionsTable.quantity, createdAt: stockTransactionsTable.createdAt }).from(stockTransactionsTable).innerJoin(medicinesTable, eq(stockTransactionsTable.medicineId, medicinesTable.id)).where(lte(stockTransactionsTable.quantity, 0));
  const totals = new Map<string, number>();
  transactions.forEach((transaction) => totals.set(transaction.medicine, (totals.get(transaction.medicine) ?? 0) + Math.abs(transaction.quantity)));
  res.json({ monthly: [{ month: "Apr", units: 3820 }, { month: "May", units: 4180 }, { month: "Jun", units: 3960 }, { month: "Jul", units: 4520 }, { month: "Aug", units: 4310 }, { month: "Sep", units: 2980 }], topMedicines: [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([medicine, units]) => ({ medicine, units })), totalIssued: transactions.reduce((sum, transaction) => sum + Math.abs(transaction.quantity), 0) });
});

router.get("/audit", async (_req, res): Promise<void> => {
  await ensureSeeded();
  const rows = await db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt));
  res.json(rows.map((row) => ({ id: row.id, action: row.action, user: row.userName, role: row.role, timestamp: row.createdAt.toISOString(), description: row.description })));
});

export default router;