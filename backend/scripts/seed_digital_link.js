"use strict";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding SLIC_POS (Digital Link & Merge Serial data)...");

  // 1. Get any supplier
  let supplier = await prisma.tblSupplier.findFirst();
  if (!supplier) {
    supplier = await prisma.tblSupplier.create({
      data: { supplierName: "Test Supplier", venderCode: "TS-01" },
    });
  }

  // 2. Get any product with a size
  let product = await prisma.tblItemCodes1S1Br.findFirst({
    where: { ProductSize: { not: null }, GTIN: { not: null } },
  });
  if (!product) {
    product = await prisma.tblItemCodes1S1Br.create({
      data: {
        ItemCode: "49188EH",
        EnglishName: "Shoe Tongue - Sport",
        ProductSize: "40",
        GTIN: "6281234567890",
      },
    });
  }

  // 3. Create Master PO
  const poNumber = `PO-DLINK-${Math.floor(Math.random() * 10000)}`;
  const master = await prisma.controlSerialMaster.create({
    data: {
      poNumber,
      supplierId: supplier.id,
      productId: product.id,
      isSentToSupplier: true,
      receivedStatus: "received",
    },
  });

  // 4. Create two serials
  const serial1Num = `${product.ItemCode}000001`;
  const serial2Num = `${product.ItemCode}000002`;

  const serial1 = await prisma.controlSerial.create({
    data: {
      serialNumber: serial1Num,
      poNumber,
      size: product.ProductSize,
      ItemCode: product.id,
      supplierId: supplier.id,
      masterId: master.id,
      isSentToSupplier: true,
      isReceived: true,
      isArchived: false,
    },
  });

  const serial2 = await prisma.controlSerial.create({
    data: {
      serialNumber: serial2Num,
      poNumber,
      size: product.ProductSize,
      ItemCode: product.id,
      supplierId: supplier.id,
      masterId: master.id,
      isSentToSupplier: true,
      isReceived: true,
      isArchived: false,
    },
  });

  // 5. Fire Historical Events for Serial 1 and 2
  const events = [
    { type: "CREATED", desc: `Serial created for PO ${poNumber}` },
    { type: "SENT_TO_SUPPLIER", desc: `Sent to supplier: ${supplier.supplierName}` },
    { type: "RECEIVED", desc: `Received at warehouse for PO ${poNumber}` }
  ];

  for (const sn of [serial1Num, serial2Num]) {
    for (const ev of events) {
      await prisma.serialEvent.create({
        data: {
          serialNumber: sn,
          eventType: ev.type,
          description: ev.desc,
          performedBy: "SeedScript",
        }
      });
      // slight delay to ensure chronological order
      await new Promise(r => setTimeout(r, 10));
    }
  }

  // 6. Output to consume
  console.log(JSON.stringify({
    poNumber,
    serial1: serial1Num,
    serial2: serial2Num,
    product: {
      itemCode: product.ItemCode,
      size: product.ProductSize
    }
  }));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
