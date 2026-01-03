const { PrismaClient } = require("@prisma/client");

// Create a single shared Prisma Client instance
// This prevents connection pool exhaustion by reusing the same connection pool
const prisma = new PrismaClient({
  log: ['error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma;
