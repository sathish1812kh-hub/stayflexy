import path from "node:path";
import type { PrismaConfig } from "prisma";

// Multi-file schema: Prisma loads all *.prisma files in the schema/ directory.
// Migrations are written to src/database/prisma/migrations/ automatically.
const config = {
  schema: path.join("src", "database", "prisma", "schema"),
} satisfies PrismaConfig;

export default config;
