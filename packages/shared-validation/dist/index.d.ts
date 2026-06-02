import { ZodSchema, z } from 'zod';
export { z };
export type { ZodSchema };
export interface ValidationResult<T> {
    success: boolean;
    data?: T;
    errors?: Array<{
        field: string;
        message: string;
    }>;
}
export declare function validate<T>(schema: ZodSchema<T>, data: unknown): T;
export declare function validatePartial<T extends object>(schema: ZodSchema<T>, data: unknown): Partial<T>;
export declare const uuidSchema: z.ZodString;
export declare const emailSchema: z.ZodString;
export declare const passwordSchema: z.ZodString;
export declare const slugSchema: z.ZodString;
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodPipeline<z.ZodEffects<z.ZodDefault<z.ZodOptional<z.ZodString>>, number, string | undefined>, z.ZodNumber>;
    limit: z.ZodPipeline<z.ZodEffects<z.ZodDefault<z.ZodOptional<z.ZodString>>, number, string | undefined>, z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
}, {
    page?: string | undefined;
    limit?: string | undefined;
}>;
