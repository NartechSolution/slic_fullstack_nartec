/**
 * Migration Script: Backfill ControlSerialMaster records for existing ControlSerial rows
 *
 * This script:
 * 1. Groups existing ControlSerial rows by (poNumber, supplierId, ItemCode)
 * 2. Creates one ControlSerialMaster per group
 * 3. Updates each child's masterId to point to the new master
 *
 * Usage: node scripts/migrate-control-serial-master.js
 */

const prisma = require("../db");

async function main() {
  console.log("🔄 Starting ControlSerial → Master-Child migration...");

  // Step 1: Load all existing serials that have no masterId
  const orphanSerials = await prisma.controlSerial.findMany({
    where: { masterId: null },
    select: {
      id: true,
      poNumber: true,
      supplierId: true,
      ItemCode: true, // actually the productId FK
      isSentToSupplier: true,
      isReceived: true,
      isArchived: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`  Found ${orphanSerials.length} serials without a master record`);

  if (orphanSerials.length === 0) {
    console.log("✅ Nothing to migrate. All serials already have a masterId.");
    return;
  }

  // Step 2: Group by composite key (poNumber + supplierId + ItemCode)
  const groups = new Map();
  for (const serial of orphanSerials) {
    const key = `${serial.poNumber || ""}|${serial.supplierId || ""}|${serial.ItemCode || ""}`;
    if (!groups.has(key)) {
      groups.set(key, {
        poNumber: serial.poNumber,
        supplierId: serial.supplierId,
        productId: serial.ItemCode, // ItemCode stores TblItemCodes1S1Br.id (the productId)
        isSentToSupplier: serial.isSentToSupplier || false,
        isArchived: serial.isArchived || false,
        createdAt: serial.createdAt,
        ids: [],
      });
    }
    groups.get(key).ids.push(serial.id);
  }

  console.log(`  Identified ${groups.size} distinct group(s) to create masters for`);

  let mastersCreated = 0;
  let serialsUpdated = 0;

  for (const [key, group] of groups) {
    // Compute receivedStatus from children
    const receivedCount = group.ids.filter((id) =>
      orphanSerials.find((s) => s.id === id && s.isReceived)
    ).length;
    const total = group.ids.length;
    const receivedStatus =
      receivedCount === 0 ? "pending" : receivedCount >= total ? "received" : "partial";

    // Create master
    const master = await prisma.controlSerialMaster.create({
      data: {
        productId: group.productId || null,
        poNumber: group.poNumber || null,
        supplierId: group.supplierId || null,
        isSentToSupplier: group.isSentToSupplier,
        isArchived: group.isArchived,
        receivedStatus,
      },
    });
    mastersCreated++;

    // Update children in batches of 2000
    const BATCH_SIZE = 2000;
    for (let i = 0; i < group.ids.length; i += BATCH_SIZE) {
      const batch = group.ids.slice(i, i + BATCH_SIZE);
      const result = await prisma.controlSerial.updateMany({
        where: { id: { in: batch } },
        data: { masterId: master.id },
      });
      serialsUpdated += result.count;
    }

    console.log(
      `  ✓ Master ${master.id} created for PO "${group.poNumber}" — ${group.ids.length} serial(s) linked`
    );
  }

  console.log(`\n✅ Migration complete:`);
  console.log(`   ${mastersCreated} master record(s) created`);
  console.log(`   ${serialsUpdated} child serial(s) updated with masterId`);
}

main()
  .catch((e) => {
    console.error("❌ Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
