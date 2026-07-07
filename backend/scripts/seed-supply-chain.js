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

    // ── TESTING INSTRUCTIONS — linear walkthrough ────────────────────────

    // Group serials by (itemCode, size) so we can hand out L/R pairs inline
    const pairsByKey = new Map();
    for (const s of serials) {
      const key = `${s.itemCode}__${s.size}`;
      if (!pairsByKey.has(key)) pairsByKey.set(key, { L: null, R: null });
      pairsByKey.get(key)[s.side] = s.serialNumber;
    }
    const pairs = [];
    for (const [key, obj] of pairsByKey) {
      if (obj.L && obj.R) pairs.push({ key, L: obj.L, R: obj.R });
    }

    // Golden path = first product, first size — the flow a tester should walk first
    const golden = pairs[0]
      ? (() => {
          const [itemCode, size] = pairs[0].key.split("__");
          return { itemCode, size, L: pairs[0].L, R: pairs[0].R };
        })()
      : null;

    h1("✅ SEED COMPLETE — COPY-PASTE TESTING WALKTHROUGH");

    console.log(
      `${c.bold}Follow each step in order. Every screen, field, and click is below.${c.reset}`
    );
    console.log(`${c.dim}Tip: keep this terminal open side-by-side with the browser.${c.reset}\n`);

    // Tiny helper to print each step block consistently
    const step = (num, title) => {
      console.log(
        `${c.bold}${c.cyan}━━━ STEP ${num} ━━━ ${title} ${c.dim}${"━".repeat(
          Math.max(0, 50 - title.length)
        )}${c.reset}`
      );
    };
    const field = (label, value) =>
      console.log(`   ${c.yellow}▸${c.reset} ${label}: ${c.bold}${value}${c.reset}`);
    const action = (text) => console.log(`   ${c.green}✓${c.reset} ${text}`);
    const note = (text) => console.log(`   ${c.dim}  ${text}${c.reset}`);
    const spacer = () => console.log();

    // ─────────────────────────────────────────────────────────────────────
    step(1, "Receive the PO (Serialization app)");
    console.log(`   ${c.dim}Open:${c.reset}  ${c.bold}/purchase-order${c.reset}`);
    action(`Find the card with PO Number: ${c.bold}${PO_NUMBER}${c.reset}`);
    action(`Click the card → Control Serials list appears`);
    action(`Click the blue ${c.bold}"Receive PO"${c.reset} button (top right)`);
    spacer();
    console.log(`   ${c.magenta}→ ReceiveQtyModal opens${c.reset}`);
    if (golden) {
      console.log(`   ${c.dim}Use these values for size ${golden.size}:${c.reset}`);
      field("Right Received", `${PO_LAYOUT[golden.itemCode][golden.size].rightQty}`);
      field("Left Received", `${PO_LAYOUT[golden.itemCode][golden.size].leftQty}`);
    }
    action(`Click ${c.bold}"Confirm Receive"${c.reset}`);
    spacer();

    // ─────────────────────────────────────────────────────────────────────
    step(2, "Print box labels (SSCCs)");
    console.log(`   ${c.magenta}→ ReceivePOModal opens automatically${c.reset}`);
    action(`In "Number of boxes" row 1, type: ${c.bold}2${c.reset}`);
    action(`In "Qty per box" row 1, type: ${c.bold}5${c.reset}   (total = 2 × 5 = 10 units)`);
    action(`Click ${c.bold}"🖨️ Print Box Labels"${c.reset}`);
    note("SSCCs are generated dynamically now — each print creates brand-new 18-digit codes.");
    note("Write down (or screenshot) any 1 of the printed SSCCs — you'll scan it in Step 3.");
    action(`When the print window closes, click ${c.bold}"Put Away"${c.reset} at the bottom`);
    spacer();

    // ─────────────────────────────────────────────────────────────────────
    step(3, "Put Away — scan the SSCC");
    console.log(`   ${c.dim}Open:${c.reset}  ${c.bold}/put-away${c.reset}`);
    action(`In "Scan Barcode" field, paste the ${c.bold}18-digit SSCC${c.reset} you printed in Step 2`);
    action(`Click ${c.bold}"Continue"${c.reset} or press Enter`);
    spacer();
    console.log(`   ${c.magenta}→ Step "View Details" appears${c.reset}`);
    action(`Pick any bin from the "Select Bin Location" dropdown`);
    action(`In "Scan Bin Location Barcode" field, type anything (e.g. ${c.bold}BIN-A1${c.reset})`);
    action(`Click ${c.bold}"Confirm to Put Away"${c.reset} → then "Yes" in the modal`);
    spacer();

    // ─────────────────────────────────────────────────────────────────────
    step(4, "Pick Raw Materials");
    console.log(`   ${c.dim}Open:${c.reset}  ${c.bold}/picking-raw-materials${c.reset}`);
    if (golden) field("Search field", `${golden.itemCode}`);
    action(`Click ${c.bold}"Search"${c.reset} → results appear`);
    action(`Click the ${c.bold}"Select"${c.reset} button on the first result`);
    action(`Click the ${c.bold}"Select"${c.reset} button on a bin/lot row`);
    field("Quantity to pick", "5");
    action(`Click ${c.bold}"Confirm Pick"${c.reset}`);
    note("You should see a green success screen with a PICK-XXXX number.");
    spacer();

    // ─────────────────────────────────────────────────────────────────────
    step(5, "Verify Production RM List (NEW)");
    console.log(`   ${c.dim}Open:${c.reset}  ${c.bold}/production-list${c.reset}`);
    action(`You should see the pick you just made as a new row`);
    action(`Click the ${c.bold}👁 eye icon${c.reset} → detail modal shows item, SSCC, bin, qty, picked by, etc.`);
    spacer();

    // ─────────────────────────────────────────────────────────────────────
    step(6, "Merge Serial (Left + Right = Finished Good)");
    console.log(`   ${c.dim}Open:${c.reset}  ${c.bold}/merge-serial${c.reset}`);
    if (golden) {
      console.log(`   ${c.dim}Golden path — ${golden.itemCode} size ${golden.size}:${c.reset}`);
      field("First scan (Left)", golden.L);
      field("Second scan (Right)", golden.R);
    }
    action(`In the "Scan Serial 1" field, paste the Left serial → press Enter`);
    action(`In the "Scan Serial 2" field, paste the Right serial → press Enter`);
    action(`Click ${c.bold}"View Product Details"${c.reset}`);
    action(`Click ${c.bold}"Generate FG Barcode"${c.reset}`);
    note("You will see a QR code. Write down the FG serial shown below it — you'll need it in Step 8.");
    spacer();

    // ─────────────────────────────────────────────────────────────────────
    step(7, "Verify Finished Goods (NEW)");
    console.log(`   ${c.dim}Open:${c.reset}  ${c.bold}/finished-goods${c.reset}`);
    if (golden)
      action(
        `You should see a new card for ${c.bold}${golden.itemCode}${c.reset} · size ${c.bold}${golden.size}${c.reset} with "1 Finished Good"`
      );
    action(`Click the ${c.bold}👁 eye icon${c.reset} → side panel shows the FG serial + QR code`);
    action(`Click the ${c.bold}"🖨️ Label"${c.reset} button on the FG row`);
    action(`In the label preview modal, click ${c.bold}"🖨️ Print Label"${c.reset}`);
    note("A new window opens with an 80×100mm printable label — this is what goes on the box.");
    spacer();

    // ─────────────────────────────────────────────────────────────────────
    step(8, "Scan the QR — Public Trace Page (NEW)");
    console.log(`   ${c.dim}Option A:${c.reset}  Scan the QR on the printed label with any phone`);
    console.log(
      `   ${c.dim}Option B:${c.reset}  In the Finished Goods side panel, click the small QR thumbnail`
    );
    console.log(`   ${c.dim}Option C:${c.reset}  Manually open: ${c.bold}/fg-trace/<fgSerial>${c.reset}`);
    spacer();
    console.log(`   ${c.magenta}→ Trace page opens${c.reset}`);
    action(`Verify the product name + image`);
    action(`Verify both shoe cards (Left / Right) with their serial numbers`);
    action(`Scroll down and read the "Supply Chain History" timeline`);
    note("You should see: CREATED events for both serials → MERGED → FG_CREATED at the top.");
    spacer();

    // ─────────────────────────────────────────────────────────────────────
    h2("⏭  OPTIONAL — repeat for other sizes");
    console.log(
      `${c.dim}Steps 6–8 can be run again with any of these pairs:${c.reset}\n`
    );
    pairs.forEach((p, i) => {
      const [itemCode, size] = p.key.split("__");
      const marker = i === 0 ? `${c.green}(done above)${c.reset}` : "";
      console.log(
        `   ${c.bold}Pair ${i + 1}${c.reset}  ${itemCode} · size ${size}  ${marker}`
      );
      console.log(`      L: ${c.bold}${p.L}${c.reset}`);
      console.log(`      R: ${c.bold}${p.R}${c.reset}`);
    });
    spacer();

    // ─────────────────────────────────────────────────────────────────────
    h2("📋 Quick reference");
    field("PO Number", PO_NUMBER);
    field("Supplier email", SUPPLIER.email);
    field("Item codes", PRODUCTS.map((p) => p.ItemCode).join(", "));
    spacer();
    console.log(`   ${c.dim}All 10 serial numbers (ready to paste):${c.reset}`);
    for (const p of pairs) {
      const [itemCode, size] = p.key.split("__");
      console.log(
        `     ${c.bold}${itemCode}${c.reset} size ${c.bold}${size}${c.reset}  L=${p.L}  R=${p.R}`
      );
    }
    spacer();

    // ─────────────────────────────────────────────────────────────────────
    console.log(line("═"));
    console.log(`${c.bold}${c.green}Seed Summary${c.reset}`);
    console.log(line("═"));
    const perItem = {};
    for (const s of serials) {
      if (!perItem[s.itemCode]) perItem[s.itemCode] = { serials: 0, units: 0 };
      perItem[s.itemCode].serials += 1;
      perItem[s.itemCode].units += s.qty;
    }
    for (const [code, stats] of Object.entries(perItem)) {
      info(code, `${stats.serials} serials · ${stats.units} units`);
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
