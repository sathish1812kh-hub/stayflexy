// FILE: src/modules/inventory/container.ts
import { PrismaInventoryRepository } from "./repositories/PrismaInventoryRepository";
import { PrismaInventoryBlockRepository } from "./repositories/PrismaInventoryBlockRepository";
import { InventoryService } from "./services/InventoryService";

const inventoryRepo = new PrismaInventoryRepository();
const inventoryBlockRepo = new PrismaInventoryBlockRepository();

export const inventoryService = new InventoryService(inventoryRepo, inventoryBlockRepo);

export { inventoryRepo, inventoryBlockRepo };
