/**
 * POST /api/admin/migrate-control-serial-master
 *
 * Runs the ControlSerial → Master-Child migration entirely with raw SQL
 * on the server. Two queries total:
 *   1. Bulk INSERT into ControlSerialMaster (one row per unique PO+product+supplier)
 *   2. Bulk UPDATE ControlSerial.masterId to link children to their master
 *
 * Zero row-by-row loops, zero N+1 queries.
 *
 * Protected by a simple secret header so it can't be triggered publicly.
 */

const prisma = require("../db");

const MIGRATION_SECRET = process.env.MIGRATION_SECRET || "slic-migrate-2024";

/**
 * Generate a CUID-like unique ID using a fast crypto approach inside SQL
 * We use newid() on SQL Server to get UUID-style IDs, converted to text.
 *
 * Strategy (SQL Server):
 *  - SELECT groups of orphan serials using GROUP BY
 *  - INSERT INTO ControlSerialMaster with NEWID() as id for each group
 *  - Then UPDATE ControlSerial.masterId by joining on (poNumber, ItemCode, supplierId)
 */
async function runMigration() {
  // ── Step 1: Count orphans ────────────────────────────────────────────────
  const orphanCountResult = await prisma.$queryRaw`
    SELECT COUNT(*) AS orphanCount
    FROM [dbo].[ControlSerial]
    WHERE masterId IS NULL
  `;
  const orphanCount = Number(orphanCountResult[0]?.orphanCount ?? 0);

  if (orphanCount === 0) {
    return { skipped: true, message: "All serials already have a masterId. Nothing to migrate." };
  }

  // ── Step 2: Bulk INSERT masters using GROUP BY ───────────────────────────
  // One INSERT per distinct (poNumber, ItemCode, supplierId) group.
  // receivedStatus is computed inline from the existing child data.
  // We use NEWID() for each row's id (SQL Server native UUID generation).
  await prisma.$executeRaw`
    INSERT INTO [dbo].[ControlSerialMaster]
      (id, productId, poNumber, supplierId, isSentToSupplier, receivedStatus, isArchived, createdAt, updatedAt)
    SELECT
      LOWER(CAST(NEWID() AS NVARCHAR(36)))             AS id,
      g.ItemCode                                        AS productId,
      g.poNumber                                        AS poNumber,
      g.supplierId                                      AS supplierId,
      MAX(CAST(ISNULL(cs.isSentToSupplier, 0) AS INT)) AS isSentToSupplier,
      CASE
        WHEN SUM(CAST(ISNULL(cs.isReceived, 0) AS INT)) = 0           THEN 'pending'
        WHEN SUM(CAST(ISNULL(cs.isReceived, 0) AS INT)) = COUNT(cs.id) THEN 'received'
        ELSE 'partial'
      END                                               AS receivedStatus,
      MAX(CAST(ISNULL(cs.isArchived, 0) AS INT))        AS isArchived,
      GETUTCDATE()                                      AS createdAt,
      GETUTCDATE()                                      AS updatedAt
    FROM [dbo].[ControlSerial] cs
    CROSS APPLY (
      SELECT cs.poNumber AS poNumber, cs.ItemCode AS ItemCode, cs.supplierId AS supplierId
    ) g
    WHERE cs.masterId IS NULL
    GROUP BY g.poNumber, g.ItemCode, g.supplierId
  `;

  // ── Step 3: Count inserted masters ──────────────────────────────────────
  const mastersCountResult = await prisma.$queryRaw`
    SELECT COUNT(*) AS cnt
    FROM [dbo].[ControlSerialMaster]
    WHERE createdAt >= DATEADD(MINUTE, -5, GETUTCDATE())
  `;
  const mastersCreated = Number(mastersCountResult[0]?.cnt ?? 0);

  // ── Step 4: Bulk UPDATE children → link masterId ─────────────────────────
  // Single UPDATE with a JOIN — all children updated in one round-trip.
  const updateResult = await prisma.$executeRaw`
    UPDATE cs
    SET cs.masterId = m.id
    FROM [dbo].[ControlSerial] cs
    INNER JOIN [dbo].[ControlSerialMaster] m
      ON  ISNULL(cs.poNumber,   '') = ISNULL(m.poNumber,   '')
      AND ISNULL(cs.ItemCode,   '') = ISNULL(m.productId,  '')
      AND ISNULL(cs.supplierId, '') = ISNULL(m.supplierId, '')
    WHERE cs.masterId IS NULL
  `;

  return {
    skipped: false,
    orphanCount,
    mastersCreated,
    serialsUpdated: Number(updateResult),
    message: `Migration complete: ${mastersCreated} master(s) created, ${Number(updateResult)} serial(s) linked.`,
  };
}

// ─── Controller ───────────────────────────────────────────────────────────
exports.runMigration = async (req, res) => {
  const secret = req.headers["x-migration-secret"] || req.query.secret;

  if (secret !== MIGRATION_SECRET) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const start = Date.now();
  try {
    const result = await runMigration();
    const durationMs = Date.now() - start;
    return res.status(200).json({
      success: true,
      durationMs,
      ...result,
    });
  } catch (err) {
    console.error("Migration error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Migration failed",
      durationMs: Date.now() - start,
    });
  }
};

/**
 * GET /api/admin/migrate-control-serial-master/status
 * Quick stats — how many serials still need migration.
 */
exports.migrationStatus = async (req, res) => {
  const secret = req.headers["x-migration-secret"] || req.query.secret;
  if (secret !== MIGRATION_SECRET) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const [orphans, masters, total] = await Promise.all([
      prisma.$queryRaw`SELECT COUNT(*) AS cnt FROM [dbo].[ControlSerial] WHERE masterId IS NULL`,
      prisma.$queryRaw`SELECT COUNT(*) AS cnt FROM [dbo].[ControlSerialMaster]`,
      prisma.$queryRaw`SELECT COUNT(*) AS cnt FROM [dbo].[ControlSerial]`,
    ]);

    return res.status(200).json({
      success: true,
      totalSerials: Number(total[0]?.cnt ?? 0),
      totalMasters: Number(masters[0]?.cnt ?? 0),
      orphanSerials: Number(orphans[0]?.cnt ?? 0),
      migratedSerials: Number(total[0]?.cnt ?? 0) - Number(orphans[0]?.cnt ?? 0),
      isComplete: Number(orphans[0]?.cnt ?? 0) === 0,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Status check failed" });
  }
};
