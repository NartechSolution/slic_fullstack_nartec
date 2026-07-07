const express = require("express");
const router = express.Router();
const migrationController = require("../controllers/migration");

/**
 * GET /api/admin/migrate/status
 * Check how many serials are still un-migrated
 * Header: x-migration-secret: <MIGRATION_SECRET>
 */
router.get("/status", migrationController.migrationStatus);

/**
 * POST /api/admin/migrate/run
 * Execute the ControlSerial → Master-Child migration (raw SQL, single round-trip)
 * Header: x-migration-secret: <MIGRATION_SECRET>
 */
router.post("/run", migrationController.runMigration);

module.exports = router;
