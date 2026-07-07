const crypto = require("crypto");
const prisma = require("./db");

async function main() {
  const data = [
    {
      TXN_CODE: "RCIN",
      TXN_NAME: "Riyadh Cash Sales Invoice",
      TXN_TYPE: "CL105326",
      TXNLOCATIONCODE: "FG206",
      CUSTOMERCODE: "CL105326",
    },
    {
      TXN_CODE: "RCSR",
      TXN_NAME: "Riyadh Sales Return",
      TXN_TYPE: "CL105326",
      TXNLOCATIONCODE: "FG206",
      CUSTOMERCODE: "CL105326",
    },
  ];

  for (const trx of data) {
    // First, try to find existing record by TXN_CODE
    const existing = await prisma.trxCodesType.findFirst({
      where: { TXN_CODE: trx.TXN_CODE },
    });

    if (existing) {
      // Update existing record
      await prisma.trxCodesType.update({
        where: { id: existing.id },
        data: {
          TXN_NAME: trx.TXN_NAME,
          TXN_TYPE: trx.TXN_TYPE,
          TXNLOCATIONCODE: trx.TXNLOCATIONCODE,
          CUSTOMERCODE: trx.CUSTOMERCODE,
        },
      });
      console.log(`Updated: ${trx.TXN_CODE}`);
    } else {
      // Create new record
      await prisma.trxCodesType.create({
        data: {
          id: crypto.randomUUID(),
          ...trx,
        },
      });
      console.log(`Created: ${trx.TXN_CODE}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
