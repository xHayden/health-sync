// prisma.ts
import { PrismaClient } from "@prisma/client";

declare global {
  // Allow global 'prisma' to be either PrismaClient or undefined
  // (only needed in development environments)
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;
