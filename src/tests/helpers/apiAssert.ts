import { expect, type APIResponse } from "@playwright/test";

export async function assertSuccess(response: APIResponse): Promise<unknown> {
  expect(response.status()).toBeGreaterThanOrEqual(200);
  expect(response.status()).toBeLessThan(300);
  const body = await response.json() as { success: boolean; data: unknown };
  expect(body.success).toBe(true);
  return body.data;
}

export async function assertError(
  response: APIResponse,
  expectedStatus: number,
  expectedCode?: string
): Promise<void> {
  expect(response.status()).toBe(expectedStatus);
  const body = await response.json() as {
    success: boolean;
    error: { code: string; message: string };
  };
  expect(body.success).toBe(false);
  expect(body.error).toBeDefined();
  if (expectedCode) {
    expect(body.error.code).toBe(expectedCode);
  }
}

export async function assertPaginated(response: APIResponse): Promise<void> {
  expect(response.ok()).toBe(true);
  const body = await response.json() as {
    success: boolean;
    data: unknown[];
    meta: { pagination: { page: number; limit: number; total: number } };
  };
  expect(body.success).toBe(true);
  expect(Array.isArray(body.data)).toBe(true);
  expect(body.meta?.pagination).toBeDefined();
  expect(typeof body.meta.pagination.page).toBe("number");
  expect(typeof body.meta.pagination.total).toBe("number");
}
