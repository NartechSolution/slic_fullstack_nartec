/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLEAR ALL CONTROL SERIALS & MASTERS (SAFE BATCH DELETE)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Purpose:
 *   Fully wipes ControlSerial, ControlSerialMaster, and SerialEvent rows.
 *   Designed for databases with 4–5 million+ records — uses batched
 *   `DELETE TOP (N)` in a loop so the SQL Server transaction log does not
 *   blow up and so locks stay short.
 *
 * What it deletes:
 *   - All rows in [dbo].[ControlSerial]
 *   - All rows in [dbo].[ControlSerialMaster]
 *   - All rows in [dbo].[SerialEvent]   (depends on ControlSerial.serialNumber)
 *
 * What it does NOT touch:
 *   - Products (TblItemCodes1S1Br)
 *   - Suppliers
 *   - Bin locations
 *   - Raw material lots, put-away records, pickings
 *   - Any other reference data
 *
 * Usage:
 *   node scripts/clear-control-serials.js            # dry-run, shows counts
 *   node scripts/clear-control-serials.js --confirm  # actually deletes
 *
 * Optional flags:
 *   --batch=10000          # batch size per DELETE TOP (default 10000)
 *   --skip-events          # don't touch SerialEvent table
 *
 * Safety:
 *   - Refuses to run without --confirm
 *   - Prints pre-count and post-count per table
 *   - Uses `DELETE TOP (batch)` in a WHILE loop — no big transaction
 *   - Progress logged every batch
 *
 * Performance notes:
 *   - Each batch is its own implicit transaction (short-lived)
 *   - At batch size 10,000, ~5M rows ≈ 500 batches
 *   - Typical throughput on SQL Server: 20k–100k rows/sec depending on disk
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({ log: ["error", "warn"] });

// ─── CLI args ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const CONFIRM = args.includes("--confirm");
const SKIP_EVENTS = args.includes("--skip-events");
const batchArg = args.find((a) => a.startsWith("--batch="));
const BATCH_SIZE = batchArg ? parseInt(batchArg.split("=")[1], 10) : 10000;

if (!BATCH_SIZE || BATCH_SIZE <= 0 || BATCH_SIZE > 100000) {
  console.error("✖ --batch must be between 1 and 100000");
  process.exit(1);
}

// ─── Helpers ───────────────────────────────────────────────────────────────
const fmt = (n) => Number(n).toLocaleString("en-US");

async function countTable(table) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS cnt FROM [dbo].[${table}]`
  );
  return Number(rows[0]?.cnt || 0);
}

async function batchDelete(table, batchSize) {
  let totalDeleted = 0;
  let batchNum = 0;
  const started = Date.now();

  while (true) {
    batchNum++;
    const t0 = Date.now();
    const deleted = await prisma.$executeRawUnsafe(
      `DELETE TOP (${batchSize}) FROM [dbo].[${table}]`
    );
    const dt = Date.now() - t0;
    totalDeleted += deleted;

    if (deleted === 0) break;

    const rate = deleted / Math.max(dt / 1000, 0.001);
    console.log(
      `  [${table}] batch ${batchNum}: ${fmt(deleted)} rows in ${dt}ms (${fmt(
        Math.round(rate)
      )} rows/sec) — total so far ${fmt(totalDeleted)}`
    );
  }

  const totalDt = Date.now() - started;
  console.log(
    `  [${table}] DONE — deleted ${fmt(totalDeleted)} rows in ${(
      totalDt / 1000
    ).toFixed(1)}s\n`
  );
  return totalDeleted;
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  CLEAR CONTROL SERIALS (batched, log-friendly)");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  batch size:   ${fmt(BATCH_SIZE)}`);
  console.log(`  skip events:  ${SKIP_EVENTS}`);
  console.log(`  confirm:      ${CONFIRM}`);
  console.log(`  db url:       ${process.env.DATABASE_URL?.split("@")[1] || "(set)"}`);
  console.log();

  // Pre-count
  console.log("Pre-count:");
  const preCS = await countTable("ControlSerial");
  const preMaster = await countTable("ControlSerialMaster");
  const preEvents = SKIP_EVENTS ? 0 : await countTable("SerialEvent");
  console.log(`  ControlSerial       : ${fmt(preCS)}`);
  console.log(`  ControlSerialMaster : ${fmt(preMaster)}`);
  console.log(`  SerialEvent         : ${SKIP_EVENTS ? "(skipped)" : fmt(preEvents)}`);
  console.log();

  if (!CONFIRM) {
    console.log("✖ Dry run only — nothing deleted.");
    console.log("  Re-run with --confirm to actually delete.");
    console.log();
    console.log("Example:");
    console.log("  node scripts/clear-control-serials.js --confirm");
    console.log("  node scripts/clear-control-serials.js --confirm --batch=20000");
    await prisma.$disconnect();
    return;
  }

  const started = Date.now();

  // 1. SerialEvent first — no FK but depends on serialNumber existing
  if (!SKIP_EVENTS && preEvents > 0) {
    console.log("→ Deleting SerialEvent rows…");
    await batchDelete("SerialEvent", BATCH_SIZE);
  }

  // 2. ControlSerial — must go before ControlSerialMaster (FK dependency)
  if (preCS > 0) {
    console.log("→ Deleting ControlSerial rows…");
    await batchDelete("ControlSerial", BATCH_SIZE);
  }

  // 3. ControlSerialMaster — delete last
  if (preMaster > 0) {
    console.log("→ Deleting ControlSerialMaster rows…");
    await batchDelete("ControlSerialMaster", BATCH_SIZE);
  }

  // Post-count (verification)
  console.log("Post-count:");
  const postCS = await countTable("ControlSerial");
  const postMaster = await countTable("ControlSerialMaster");
  const postEvents = SKIP_EVENTS ? null : await countTable("SerialEvent");
  console.log(`  ControlSerial       : ${fmt(postCS)}`);
  console.log(`  ControlSerialMaster : ${fmt(postMaster)}`);
  console.log(`  SerialEvent         : ${SKIP_EVENTS ? "(skipped)" : fmt(postEvents)}`);
  console.log();

  const totalDt = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`✔ Completed in ${totalDt}s`);

  if (postCS > 0 || postMaster > 0 || (!SKIP_EVENTS && postEvents > 0)) {
    console.warn("⚠ Some rows remain. Re-run or investigate foreign-key blocks.");
    process.exitCode = 2;
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("✖ ERROR:", e.message || e);
  await prisma.$disconnect();
  process.exit(1);
});
