// FILE: src/modules/inventory/index.ts

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  InventoryBlockReason,
  Inventory,
  InventoryBlock,
  AvailabilityResult,
  DateRangeAvailability,
  CreateInventoryData,
  UpdateInventoryData,
  CreateInventoryBlockData,
  UpdateInventoryBlockData,
} from "./types";

// ─── Constants ────────────────────────────────────────────────────────────────
export {
  INVENTORY_ERRORS,
  BLOCK_REASONS,
  MAX_INVENTORY_BLOCK_DAYS,
  MAX_INVENTORY_QUANTITY,
  MAX_DATE_RANGE_DAYS,
  DEFAULT_INVENTORY_COUNT,
} from "./constants";

// ─── DTOs ─────────────────────────────────────────────────────────────────────
export {
  InventoryQueryDto,
  SetInventoryDto,
  BulkSetInventoryDto,
  BlockInventoryDto,
  BulkBlockInventoryDto,
  UnblockInventoryDto,
  AvailabilityQueryDto,
} from "./dto";
export type {
  InventoryQueryDtoType,
  SetInventoryDtoType,
  BulkSetInventoryDtoType,
  BlockInventoryDtoType,
  BulkBlockInventoryDtoType,
  UnblockInventoryDtoType,
  AvailabilityQueryDtoType,
} from "./dto";

// ─── Validators ───────────────────────────────────────────────────────────────
export {
  parseInventoryDate,
  validateInventoryQuery,
  validateSetInventory,
  validateBulkSetInventory,
  validateBlockInventory,
  validateBulkBlockInventory,
  validateUnblockInventory,
  validateAvailabilityQuery,
} from "./validators";

// ─── Repositories ─────────────────────────────────────────────────────────────
export { InventoryRepository, InventoryBlockRepository } from "./repositories";

// ─── Services ─────────────────────────────────────────────────────────────────
export { InventoryService } from "./services";

// ─── Controller ───────────────────────────────────────────────────────────────
export { InventoryController } from "./controllers";

// ─── Middleware ───────────────────────────────────────────────────────────────
export { withInventoryHotelAccess } from "./middleware";
