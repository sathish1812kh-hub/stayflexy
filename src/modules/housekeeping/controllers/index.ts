// FILE: src/modules/housekeeping/controllers/index.ts
import { type NextRequest } from "next/server";
import {
  successResponse,
  createdResponse,
  paginatedResponse,
} from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import {
  validateCreateHousekeepingTask,
  validateUpdateHousekeepingTask,
  validateAssignTask,
  validateUpdateTaskStatus,
  validateHousekeepingTaskFilter,
  validateRoomStatusFilter,
} from "../validators";
import type { HousekeepingService } from "../services";

export class HousekeepingController {
  constructor(private readonly housekeepingService: HousekeepingService) {}

  async create(req: NextRequest) {
    try {
      const body = (await req.json()) as unknown;
      const dto = validateCreateHousekeepingTask(body);
      const userId = req.headers.get("x-user-id") ?? "";
      const orgId = req.headers.get("x-org-id") ?? "";
      const task = await this.housekeepingService.createTask(dto, userId, orgId);
      return createdResponse(task);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async list(req: NextRequest) {
    try {
      const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
      const filter = validateHousekeepingTaskFilter(searchParams);
      const orgId = req.headers.get("x-org-id") ?? "";
      const result = await this.housekeepingService.listTasks(filter, orgId);
      return paginatedResponse(result.data, result.meta);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async getById(
    req: NextRequest,
    { params }: { params: { id: string } }
  ) {
    try {
      const orgId = req.headers.get("x-org-id") ?? "";
      const task = await this.housekeepingService.getTask(params.id, orgId);
      return successResponse(task);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async assign(
    req: NextRequest,
    { params }: { params: { id: string } }
  ) {
    try {
      const body = (await req.json()) as unknown;
      const dto = validateAssignTask(body);
      const userId = req.headers.get("x-user-id") ?? "";
      const orgId = req.headers.get("x-org-id") ?? "";
      const task = await this.housekeepingService.assignTask(
        params.id,
        dto,
        userId,
        orgId
      );
      return successResponse(task);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async updateStatus(
    req: NextRequest,
    { params }: { params: { id: string } }
  ) {
    try {
      const body = (await req.json()) as unknown;
      const dto = validateUpdateTaskStatus(body);
      const userId = req.headers.get("x-user-id") ?? "";
      const orgId = req.headers.get("x-org-id") ?? "";
      const task = await this.housekeepingService.updateTaskStatus(
        params.id,
        dto,
        userId,
        orgId
      );
      return successResponse(task);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async update(
    req: NextRequest,
    { params }: { params: { id: string } }
  ) {
    try {
      const body = (await req.json()) as unknown;
      const dto = validateUpdateHousekeepingTask(body);
      const userId = req.headers.get("x-user-id") ?? "";
      const orgId = req.headers.get("x-org-id") ?? "";
      const task = await this.housekeepingService.updateTask(
        params.id,
        dto,
        userId,
        orgId
      );
      return successResponse(task);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async getRoomStatuses(req: NextRequest) {
    try {
      const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
      const filter = validateRoomStatusFilter(searchParams);
      const orgId = req.headers.get("x-org-id") ?? "";
      const result = await this.housekeepingService.getRoomStatuses(filter, orgId);
      return successResponse(result);
    } catch (error) {
      return handleRouteError(error);
    }
  }
}
