import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaReady?: Promise<void>;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Vercel's serverless functions run on a read-only filesystem except for /tmp,
// so this demo points DATABASE_URL at file:/tmp/dev.db there — which starts
// empty on every cold start. Bootstrap the schema once per instance before the
// first query instead of relying on a prior `prisma migrate deploy` run.
const CREATE_TABLES_SQL = [
  `CREATE TABLE IF NOT EXISTS "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cjProductId" TEXT,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "images" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "cjPrice" REAL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT,
    "sourceUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Product_cjProductId_key" ON "Product"("cjProductId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Product_sku_key" ON "Product"("sku")`,
  `CREATE TABLE IF NOT EXISTS "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "cjOrderId" TEXT,
    "total" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" REAL NOT NULL,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
];

export function ensureSchema(): Promise<void> {
  if (!process.env.DATABASE_URL?.startsWith("file:/tmp/")) {
    return Promise.resolve();
  }
  if (!globalForPrisma.prismaSchemaReady) {
    globalForPrisma.prismaSchemaReady = (async () => {
      for (const statement of CREATE_TABLES_SQL) {
        await prisma.$executeRawUnsafe(statement);
      }
    })();
  }
  return globalForPrisma.prismaSchemaReady;
}
