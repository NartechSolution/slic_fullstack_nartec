/**
 * One-off data fix: assign a SalesmanCode to an existing user.
 *
 * Users created through the Users popup are stored with SalesmanCode = null,
 * because the signup flow never passes it. The POS sends this value to the ERP
 * on every invoice (F3TenderCashPopUp -> SalesmanCode), so a null code has to be
 * backfilled manually until the field is exposed in the Users screen.
 *
 * Usage: node scripts/set-user-salesman-code.js <UserLoginID> <SalesmanCode>
 * Example: node scripts/set-user-salesman-code.js KHASSAN 022C
 */

require("dotenv").config();
const prisma = require("../db");

async function main() {
  const [userLoginID, salesmanCode] = process.argv.slice(2);

  if (!userLoginID || !salesmanCode) {
    console.error("Usage: node scripts/set-user-salesman-code.js <UserLoginID> <SalesmanCode>");
    process.exitCode = 1;
    return;
  }

  const user = await prisma.tblUsers.findFirst({
    where: { UserLoginID: userLoginID },
    select: { TblSysNoID: true, UserLoginID: true, SalesmanCode: true },
  });

  if (!user) {
    console.error(`No user found with UserLoginID "${userLoginID}". Nothing changed.`);
    process.exitCode = 1;
    return;
  }

  if (user.SalesmanCode === salesmanCode) {
    console.log(`"${user.UserLoginID}" already has SalesmanCode "${salesmanCode}". Nothing changed.`);
    return;
  }

  console.log(`Updating "${user.UserLoginID}": ${user.SalesmanCode ?? "null"} -> ${salesmanCode}`);

  const updated = await prisma.tblUsers.update({
    where: { TblSysNoID: user.TblSysNoID },
    data: { SalesmanCode: salesmanCode },
    select: { UserLoginID: true, SalesmanCode: true },
  });

  console.log(`Done. "${updated.UserLoginID}" now has SalesmanCode "${updated.SalesmanCode}".`);
}

main()
  .catch((error) => {
    console.error("Failed to update SalesmanCode:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
