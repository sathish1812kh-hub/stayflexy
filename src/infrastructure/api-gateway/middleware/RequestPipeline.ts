// Centralized middleware pipeline for the API gateway layer.
// Composes multiple MiddlewareFn in order; each calls next() to continue the chain.
import type { NextRequest, NextResponse } from "next/server";
import type { MiddlewareFn } from "../types";

export class RequestPipeline {
  private readonly middlewares: MiddlewareFn[] = [];

  use(middleware: MiddlewareFn): this {
    this.middlewares.push(middleware);
    return this;
  }

  build(): (req: NextRequest) => Promise<NextResponse> {
    const middlewares = [...this.middlewares];

    return async (req: NextRequest): Promise<NextResponse> => {
      let index = 0;

      const next = async (): Promise<NextResponse> => {
        if (index >= middlewares.length) {
          const { NextResponse: NR } = await import("next/server");
          return NR.json({ error: "No handler" }, { status: 500 });
        }
        const middleware = middlewares[index++];
        if (!middleware) {
          const { NextResponse: NR } = await import("next/server");
          return NR.json({ error: "No handler" }, { status: 500 });
        }
        return middleware(req, next);
      };

      return next();
    };
  }
}
