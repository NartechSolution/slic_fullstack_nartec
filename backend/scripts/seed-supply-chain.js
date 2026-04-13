/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SLIC SUPPLY CHAIN — END-TO-END SEED SCRIPT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Populates the SLIC_POS database with a full, clean, testable supply chain:
 *
 *   1. Products   (2 items × multiple sizes with Left/Right tracking)
 *   2. Supplier
 *   3. PO + Control Serials  (uses new side/sideQty model)
 *   4. (optional) SerialEvent audit rows
 *
 * What it does NOT touch:
 *   - BinLocations (created via admin UI, left alone)
 *   - RawMaterialLot, PutAway, Picking (lives in serialization backend)
 *   - MergeRecord / Finished goods (tester creates via UI flow)
 *
 * Usage:
 *   # From SLIC_POS/backend
 *   npm run seed
 *
 *   # Or:
 *   node scripts/seed-supply-chain.js
 *
 * Flags:
 *   --reset         Delete all existing test serials + masters + FG first
 *   --products-only Only create/update products (skip PO + serials)
 *
 * The script prints every created ID and the EXACT values a tester should
 * type into each screen so they can walk the full flow without guessing.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({ log: ["warn", "error"] });

// ── CLI args ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const RESET = args.includes("--reset");
const PRODUCTS_ONLY = args.includes("--products-only");

// ── pretty console helpers ────────────────────────────────────────────────
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

const line = (ch = "─", len = 75) => c.dim + ch.repeat(len) + c.reset;
const h1 = (title) =>
  console.log(
    `\n${c.bold}${c.cyan}╔${"═".repeat(73)}╗\n║ ${title.padEnd(72)}║\n╚${"═".repeat(73)}╝${c.reset}\n`
  );
const h2 = (title) =>
  console.log(`\n${c.bold}${c.blue}▶ ${title}${c.reset}\n${line()}`);
const ok = (msg) => console.log(`  ${c.green}✓${c.reset} ${msg}`);
const info = (label, value) =>
  console.log(`    ${c.dim}${label.padEnd(18)}${c.reset} ${c.bold}${value}${c.reset}`);
const warn = (msg) => console.log(`  ${c.yellow}⚠${c.reset} ${msg}`);
const err = (msg) => console.log(`  ${c.red}✗${c.reset} ${msg}`);
const hint = (title, lines) => {
  console.log(`\n  ${c.magenta}┌── ${title} ───────${c.reset}`);
  lines.forEach((l) => console.log(`  ${c.magenta}│${c.reset} ${l}`));
  console.log(`  ${c.magenta}└${"─".repeat(35)}${c.reset}`);
};

// ── Seed data (tunable) ───────────────────────────────────────────────────
const SUPPLIER = {
  name: "Nartec Test Supplier",
  email: "supplier@nartec.test",
  status: "approved",
};

const PRODUCTS = [
  {
    ItemCode: "SLIC-TST1",
    EnglishName: "Safety Boot — Composite Toe (TEST)",
    ArabicName: "حذاء أمان اختباري",
    BrandName: "SLIC Test",
    color: "Brown",
    upper: "Genuine Leather",
    sole: "Rubber",
    width: "Wide",
    sizes: ["38", "40", "42"],
    gtinBySize: {
      38: "6281004918838",
      40: "6281004918840",
      42: "6281004918842",
    },
  },
  {
    ItemCode: "SLIC-TST2",
    EnglishName: "Casual Slip-On (TEST)",
    ArabicName: "حذاء كاجوال اختباري",
    BrandName: "SLIC Test",
    color: "Black",
    upper: "Synthetic",
    sole: "PU",
    width: "Regular",
    sizes: ["40", "41"],
    gtinBySize: {
      40: "6281005678940",
      41: "6281005678941",
    },
  },
];

const PO_NUMBER = `PO-SEED-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;

// How many units per side, per size, per product
const PO_LAYOUT = {
  "SLIC-TST1": {
    38: { rightQty: 10, leftQty: 10 },
    40: { rightQty: 20, leftQty: 20 },
    42: { rightQty: 5, leftQty: 5 },
  },
  "SLIC-TST2": {
    40: { rightQty: 15, leftQty: 15 },
    41: { rightQty: 8, leftQty: 8 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════

async function resetTestData() {
  h2("RESET — clearing existing test data");
  const testItemCodes = PRODUCTS.map((p) => p.ItemCode);

  // Find products (to get their ids)
  const existingProducts = await prisma.tblItemCodes1S1Br.findMany({
    where: { ItemCode: { in: testItemCodes } },
    select: { id: true, ItemCode: true, ProductSize: true },
  });
  const productIds = existingProducts.map((p) => p.id);

  // Delete control serials for these products
  if (productIds.length > 0) {
    const delSerials = await prisma.controlSerial.deleteMany({
      where: { ItemCode: { in: productIds } },
    });
    ok(`Deleted ${delSerials.count} test control serials`);

    const delMasters = await prisma.controlSerialMaster.deleteMany({
      where: { productId: { in: productIds } },
    });
    ok(`Deleted ${delMasters.count} test masters`);
  }

  // Delete merge records for these item codes
  const delMerge = await prisma.mergeRecord.deleteMany({
    where: { itemCode: { in: testItemCodes } },
  });
  ok(`Deleted ${delMerge.count} test merge records`);

  // Delete product rows
  const delProducts = await prisma.tblItemCodes1S1Br.deleteMany({
    where: { ItemCode: { in: testItemCodes } },
  });
  ok(`Deleted ${delProducts.count} test products`);
}

async function seedSupplier() {
  h2("STEP 1 — Supplier");
  const existing = await prisma.supplier.findFirst({ where: { email: SUPPLIER.email } });
  let supplier;
  if (existing) {
    supplier = existing;
    info("Supplier already exists", supplier.name);
  } else {
    supplier = await prisma.supplier.create({ data: SUPPLIER });
    ok("Created supplier");
  }
  info("supplier.id", supplier.id);
  info("name", supplier.name);
  info("email", supplier.email);
  info("status", supplier.status);
  return supplier;
}

async function seedProducts() {
  h2("STEP 2 — Products (one row per size)");

  const createdProducts = []; // [{ItemCode, size, id, ...}]
  for (const p of PRODUCTS) {
    for (const size of p.sizes) {
      const gtin = p.gtinBySize[size];
      // Check if exists
      const existing = await prisma.tblItemCodes1S1Br.findFirst({
        where: { ItemCode: p.ItemCode, ProductSize: size },
      });

      let product;
      if (existing) {
        product = await prisma.tblItemCodes1S1Br.update({
          where: { id: existing.id },
          data: {
            EnglishName: p.EnglishName,
            ArabicName: p.ArabicName,
            GTIN: gtin,
            BrandName: p.BrandName,
            color: p.color,
            upper: p.upper,
            sole: p.sole,
            width: p.width,
            ProductSize: size,
          },
        });
      } else {
        product = await prisma.tblItemCodes1S1Br.create({
          data: {
            ItemCode: p.ItemCode,
            EnglishName: p.EnglishName,
            ArabicName: p.ArabicName,
            GTIN: gtin,
            BrandName: p.BrandName,
            color: p.color,
            upper: p.upper,
            sole: p.sole,
            width: p.width,
            ProductSize: size,
            ProductType: "Footwear",
            ProductUnit: "Pair",
            ItemQty: 0,
          },
        });
      }
      createdProducts.push(product);
      ok(`${p.ItemCode} · size ${size} · GTIN ${gtin} · id=${product.id}`);
    }
  }
  return createdProducts;
}

async function seedPoWithSerials(supplier, products) {
  h2("STEP 3 — Purchase Order + Control Serials (left/right)");

  // Group products by ItemCode
  const productsByItemCode = new Map();
  for (const p of products) {
    if (!productsByItemCode.has(p.ItemCode)) productsByItemCode.set(p.ItemCode, []);
    productsByItemCode.get(p.ItemCode).push(p);
  }

  const allCreatedSerials = []; // for final console

  for (const itemCode of Object.keys(PO_LAYOUT)) {
    const layout = PO_LAYOUT[itemCode];
    const productRows = productsByItemCode.get(itemCode) || [];
    if (productRows.length === 0) {
      warn(`No product rows found for ${itemCode} — skipping`);
      continue;
    }

    // Create one master per (PO, itemCode) — use first product for master FK
    const primary = productRows[0];
    let master = await prisma.controlSerialMaster.findFirst({
      where: { poNumber: PO_NUMBER, productId: primary.id },
    });
    if (!master) {
      master = await prisma.controlSerialMaster.create({
        data: {
          poNumber: PO_NUMBER,
          productId: primary.id,
          supplierId: supplier.id,
          receivedStatus: "pending",
          isSentToSupplier: false,
        },
      });
      ok(`Master created for ${itemCode} · id=${master.id}`);
    } else {
      info("Master already exists for", `${itemCode} · id=${master.id}`);
    }

    // Find max existing serial sequence for this raw ItemCode (to continue numbering cleanly)
    let nextSeq = 1;
    const rows = await prisma.$queryRawUnsafe(`
      SELECT TOP 1 serialNumber
      FROM [dbo].[ControlSerial]
      WHERE serialNumber LIKE '${itemCode}%'
        AND LEN(serialNumber) = ${itemCode.length + 6}
      ORDER BY serialNumber DESC
    `);
    if (rows && rows[0]?.serialNumber) {
      const lastSeq = parseInt(rows[0].serialNumber.slice(-6), 10);
      if (!Number.isNaN(lastSeq)) nextSeq = lastSeq + 1;
    }

    // For each size, create R + L serials
    for (const size of Object.keys(layout)) {
      const { rightQty, leftQty } = layout[size];
      const sizeProduct = productRows.find((p) => p.ProductSize === size);
      if (!sizeProduct) {
        warn(`No product row for ${itemCode} size ${size} — skipping`);
        continue;
      }

      const makeSerial = (seq) => `${itemCode}${String(seq).padStart(6, "0")}`;

      // Right serial
      if (rightQty > 0) {
        const rSerial = makeSerial(nextSeq++);
        const rRow = await prisma.controlSerial.create({
          data: {
            serialNumber: rSerial,
            ItemCode: sizeProduct.id,
            supplierId: supplier.id,
            poNumber: PO_NUMBER,
            size,
            masterId: master.id,
            side: "R",
            sideQty: rightQty,
            isSentToSupplier: false,
            isReceived: false,
          },
        });
        allCreatedSerials.push({ itemCode, size, side: "R", serialNumber: rSerial, qty: rightQty, id: rRow.id });
        ok(`${rSerial} · size ${size} · RIGHT · qty=${rightQty}`);
      }

      // Left serial
      if (leftQty > 0) {
        const lSerial = makeSerial(nextSeq++);
        const lRow = await prisma.controlSerial.create({
          data: {
            serialNumber: lSerial,
            ItemCode: sizeProduct.id,
            supplierId: supplier.id,
            poNumber: PO_NUMBER,
            size,
            masterId: master.id,
            side: "L",
            sideQty: leftQty,
            isSentToSupplier: false,
            isReceived: false,
          },
        });
        allCreatedSerials.push({ itemCode, size, side: "L", serialNumber: lSerial, qty: leftQty, id: lRow.id });
        ok(`${lSerial} · size ${size} · LEFT  · qty=${leftQty}`);
      }
    }
  }

  return allCreatedSerials;
}

async function fireCreatedEvents(serials) {
  h2("STEP 4 — Audit events (SerialEvent · CREATED)");
  if (serials.length === 0) {
    warn("No serials to log — skipping");
    return;
  }
  const events = serials.map((s) => ({
    serialNumber: s.serialNumber,
    eventType: "CREATED",
    description: `Seeded via seed-supply-chain.js for PO ${PO_NUMBER}`,
    metadata: JSON.stringify({ poNumber: PO_NUMBER, side: s.side, sideQty: s.qty, size: s.size }),
    performedBy: "seed-script",
  }));
  // Insert in chunks of 500 to keep params well under the 2100 limit
  const CHUNK = 500;
  let total = 0;
  for (let i = 0; i < events.length; i += CHUNK) {
    const slice = events.slice(i, i + CHUNK);
    const result = await prisma.serialEvent.createMany({ data: slice });
    total += result.count;
  }
  ok(`Fired ${total} CREATED events`);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("\n");
  h1("SLIC SUPPLY CHAIN SEED — END-TO-END TEST DATA");
  console.log(
    `${c.dim}Target DB:${c.reset} ${process.env.DATABASE_URL?.split("@")[1]?.split(";")[0] || "(check .env)"}`
  );
  console.log(`${c.dim}PO Number:${c.reset} ${c.bold}${PO_NUMBER}${c.reset}`);
  if (RESET) console.log(`${c.yellow}Mode:${c.reset} --reset (will clear existing test data first)`);
  if (PRODUCTS_ONLY) console.log(`${c.yellow}Mode:${c.reset} --products-only`);

  const t0 = Date.now();

  try {
    if (RESET) {
      await resetTestData();
    }

    const supplier = await seedSupplier();

    const products = await seedProducts();

    if (PRODUCTS_ONLY) {
      h2("--products-only specified — stopping here");
      return;
    }

    const serials = await seedPoWithSerials(supplier, products);

    await fireCreatedEvents(serials);

    // ── TESTING INSTRUCTIONS ─────────────────────────────────────────────
    h1("✅ SEED COMPLETE — TESTER CHEAT SHEET");

    console.log(
      `${c.bold}Use the values below to walk through the full supply chain flow.${c.reset}`
    );
    console.log(`${c.dim}(Open the app and follow each step in order.)${c.reset}\n`);

    // Step-by-step
    console.log(`${c.bold}${c.blue}▶ Step 1: Browse the PO${c.reset}`);
    console.log(`  Screen: Digital Link → PO Numbers (/po-number in SLIC_POS)`);
    console.log(`  Look for PO: ${c.bold}${PO_NUMBER}${c.reset}`);
    console.log(`  Items: ${PRODUCTS.map((p) => p.ItemCode).join(", ")}`);
    console.log();

    console.log(`${c.bold}${c.blue}▶ Step 2: Send to Supplier${c.reset}`);
    console.log(`  Click "Send by PO" on the row → confirms email dispatch.`);
    console.log(`  Supplier email (seeded): ${c.bold}${SUPPLIER.email}${c.reset}`);
    console.log();

    console.log(`${c.bold}${c.blue}▶ Step 3: Receive PO  (Serialization app)${c.reset}`);
    console.log(`  URL: /purchase-order → pick PO → click "Receive PO"`);
    console.log(`  ReceiveQtyModal asks for Right + Left received per size.`);
    console.log(`  Use these planned quantities:`);
    for (const itemCode of Object.keys(PO_LAYOUT)) {
      console.log(`    ${c.cyan}${itemCode}${c.reset}`);
      for (const [size, qty] of Object.entries(PO_LAYOUT[itemCode])) {
        console.log(`      size ${size}: R=${qty.rightQty}, L=${qty.leftQty}`);
      }
    }
    console.log();

    console.log(`${c.bold}${c.blue}▶ Step 4: Print Box Labels → Put Away${c.reset}`);
    console.log(`  ReceivePOModal opens → enter box count × qty per box → print.`);
    console.log(`  Generated SSCCs are auto-registered in rawMaterialLot.`);
    console.log(`  Then navigate to /put-away → scan any printed SSCC → pick bin → confirm.`);
    console.log();

    console.log(`${c.bold}${c.blue}▶ Step 5: Pick Raw Materials${c.reset}`);
    console.log(`  URL: /picking-raw-materials`);
    console.log(`  Search by item code: ${c.bold}${Object.keys(PO_LAYOUT)[0]}${c.reset}`);
    console.log(`  Select a bin → enter qty → submit. Result shows PICK-… number.`);
    console.log();

    console.log(`${c.bold}${c.blue}▶ Step 6: Production RM List (NEW)${c.reset}`);
    console.log(`  URL: /production-list`);
    console.log(`  Your pick should appear as a row — click 👁 for full detail.`);
    console.log();

    console.log(`${c.bold}${c.blue}▶ Step 7: Merge Serial (L + R)${c.reset}`);
    console.log(`  URL: /merge-serial`);
    console.log(`  Scan the LEFT and RIGHT serials of the same size. Examples:`);

    // Pair up serials by (itemCode, size): emit a few ready-to-copy pairs
    const pairsByKey = new Map();
    for (const s of serials) {
      const key = `${s.itemCode}__${s.size}`;
      if (!pairsByKey.has(key)) pairsByKey.set(key, { L: null, R: null });
      pairsByKey.get(key)[s.side] = s.serialNumber;
    }
    const pairs = [];
    for (const [key, obj] of pairsByKey) {
      if (obj.L && obj.R) {
        pairs.push({ key, L: obj.L, R: obj.R });
      }
    }
    pairs.slice(0, 6).forEach((p, i) => {
      const [itemCode, size] = p.key.split("__");
      console.log(
        `    ${c.green}Pair ${i + 1}${c.reset}  ${itemCode} · size ${size}`
      );
      console.log(`       L: ${c.bold}${p.L}${c.reset}`);
      console.log(`       R: ${c.bold}${p.R}${c.reset}`);
    });
    console.log();

    console.log(`${c.bold}${c.blue}▶ Step 8: Finished Goods (NEW)${c.reset}`);
    console.log(`  URL: /finished-goods`);
    console.log(`  After each merge, a row appears grouped by (item, size).`);
    console.log(`  Click the card → see every FG serial with QR code + "Label" button.`);
    console.log(`  Click "Label" to open the printable FG label with QR pointing to /fg-trace/:fgSerial.`);
    console.log();

    console.log(`${c.bold}${c.blue}▶ Step 9: Public Trace Page${c.reset}`);
    console.log(`  Scan the QR or open: ${c.cyan}/fg-trace/<fgSerial>${c.reset}`);
    console.log(`  See full history: Product → both shoes → events → merged FG.`);
    console.log();

    // Final summary
    console.log(line("═"));
    console.log(`${c.bold}${c.green}Summary${c.reset}`);
    console.log(line("═"));
    const perItem = {};
    for (const s of serials) {
      if (!perItem[s.itemCode]) perItem[s.itemCode] = { serials: 0, units: 0, pairs: 0 };
      perItem[s.itemCode].serials += 1;
      perItem[s.itemCode].units += s.qty;
    }
    for (const [code, stats] of Object.entries(perItem)) {
      info(code, `${stats.serials} serials, ${stats.units} units`);
    }
    info("Total pairs (L+R)", pairs.length);
    info("Seed time", `${((Date.now() - t0) / 1000).toFixed(1)}s`);
    console.log(line("═"));
    console.log(`\n${c.green}${c.bold}Ready to test!${c.reset} Happy tracing. 🚀\n`);
  } catch (e) {
    err("Seed failed:");
    console.error(e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
