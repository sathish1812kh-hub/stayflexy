// FILE: src/modules/inventory/controllers/index.ts
import { type NextRequest } from "next/server";
import {
  successResponse,
  createdResponse,
} from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import {
  validateInventoryQuery,
  validateSetInventory,
  validateBulkSetInventory,
  validateBlockInventory,
  validateBulkBlockInventory,
  validateUnblockInventory,
  validateAvailabilityQuery,
  parseInventoryDate,
} from "../validators";
import type { InventoryService } from "../services";

export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  /** GET /inventory */
  async getInventory(req: NextRequest, orgId: string) {
    try {
      const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
      const dto = validateInventoryQuery(searchParams);
      const startDate = parseInventoryDate(dto.startDate);
      const endDate = parseInventoryDate(dto.endDate);
      const result = await this.inventoryService.getInventoryForHotel(
        dto.hotelId,
        startDate,
        endDate,
        orgId
      );
      return successResponse(result);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  /** POST /inventory — single or bulk set */
  async setInventory(req: NextRequest, orgId: string) {
    try {
      const body = await req.json() as unknown;
      const bodyObj = body as Record<string, unknown>;

      if ("startDate" in bodyObj && "endDate" in bodyObj) {
        const dto = validateBulkSetInventory(body);
        const result = await this.inventoryService.bulkSetInventory(dto, orgId);
        return successResponse(result);
      }

      const dto = validateSetInventory(body);
      const result = await this.inventoryService.setInventory(dto, orgId);
      return successResponse(result);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  /** GET /inventory/availability */
  async checkAvailability(req: NextRequest, orgId: string) {
    try {
      const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
      const dto = validateAvailabilityQuery(searchParams);
      const result = await this.inventoryService.checkAvailability(dto, orgId);
      return successResponse(result);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  /** POST /inventory/block — single or bulk block */
  async blockInventory(req: NextRequest, orgId: string, blockedById: string) {
    try {
      const body = await req.json() as unknown;
      const bodyObj = body as Record<string, unknown>;

      if ("startDate" in bodyObj && "endDate" in bodyObj) {
        const dto = validateBulkBlockInventory(body);
        const result = await this.inventoryService.bulkBlockInventory(dto, orgId, blockedById);
        return createdResponse(result);
      }

      const dto = validateBlockInventory(body);
      const result = await this.inventoryService.blockInventory(dto, orgId, blockedById);
      return createdResponse(result);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  /** POST /inventory/unblock */
  async unblockInventory(req: NextRequest, orgId: string) {
    try {
      const body = await req.json() as unknown;
      const dto = validateUnblockInventory(body);
      const result = await this.inventoryService.unblockInventory(dto, orgId);
      return successResponse(result);
    } catch (error) {
      return handleRouteError(error);
    }
  }
}
