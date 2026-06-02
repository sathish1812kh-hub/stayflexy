import { type NextRequest } from "next/server";
import { createdResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { validateRegisterOrgOwner } from "@modules/auth/validators";
import { authService } from "@modules/auth/container";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as unknown;
    const dto = validateRegisterOrgOwner(body);

    const { user, tokens } = await authService.register(dto, {
      ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip"),
      userAgent: req.headers.get("user-agent"),
    });

    return createdResponse({ user, tokens });
  } catch (error) {
    return handleRouteError(error);
  }
}
