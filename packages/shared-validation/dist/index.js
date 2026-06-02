"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginationSchema = exports.slugSchema = exports.passwordSchema = exports.emailSchema = exports.uuidSchema = exports.z = void 0;
exports.validate = validate;
exports.validatePartial = validatePartial;
const zod_1 = require("zod");
Object.defineProperty(exports, "z", { enumerable: true, get: function () { return zod_1.z; } });
function validate(schema, data) {
    const result = schema.safeParse(data);
    if (!result.success) {
        const errors = result.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
        }));
        const err = new Error(`Validation failed: ${errors.map((e) => `${e.field}: ${e.message}`).join(', ')}`);
        err.statusCode = 422;
        err.code = 'VALIDATION_ERROR';
        err.details = errors;
        throw err;
    }
    return result.data;
}
function validatePartial(schema, data) {
    const partialSchema = schema.partial();
    return validate(partialSchema, data);
}
// Common reusable schemas
exports.uuidSchema = zod_1.z.string().uuid('Must be a valid UUID');
exports.emailSchema = zod_1.z
    .string()
    .email('Must be a valid email address')
    .toLowerCase();
exports.passwordSchema = zod_1.z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128);
exports.slugSchema = zod_1.z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .min(2)
    .max(64);
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z
        .string()
        .optional()
        .default('1')
        .transform(Number)
        .pipe(zod_1.z.number().int().min(1)),
    limit: zod_1.z
        .string()
        .optional()
        .default('20')
        .transform(Number)
        .pipe(zod_1.z.number().int().min(1).max(100)),
});
