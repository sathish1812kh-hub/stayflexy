"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAccessToken = generateAccessToken;
exports.verifyAccessToken = verifyAccessToken;
exports.generateRefreshToken = generateRefreshToken;
exports.hashToken = hashToken;
exports.compareToken = compareToken;
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.decodeTokenUnsafe = decodeTokenUnsafe;
exports.validatePasswordStrength = validatePasswordStrength;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = require("crypto");
function generateAccessToken(payload, secret, expiresIn = '15m') {
    return jsonwebtoken_1.default.sign({ ...payload, jti: (0, crypto_1.randomUUID)() }, secret, {
        expiresIn,
    });
}
function verifyAccessToken(token, secret) {
    return jsonwebtoken_1.default.verify(token, secret);
}
function generateRefreshToken() {
    return (0, crypto_1.randomUUID)() + '-' + (0, crypto_1.randomUUID)(); // 72 chars of randomness
}
async function hashToken(token, rounds = 10) {
    return bcryptjs_1.default.hash(token, rounds);
}
async function compareToken(token, hash) {
    return bcryptjs_1.default.compare(token, hash);
}
async function hashPassword(password, rounds = 12) {
    return bcryptjs_1.default.hash(password, rounds);
}
async function verifyPassword(password, hash) {
    return bcryptjs_1.default.compare(password, hash);
}
function decodeTokenUnsafe(token) {
    try {
        return jsonwebtoken_1.default.decode(token);
    }
    catch {
        return null;
    }
}
function validatePasswordStrength(password) {
    const errors = [];
    if (password.length < 8)
        errors.push('Password must be at least 8 characters');
    if (!/[A-Z]/.test(password))
        errors.push('Password must contain at least one uppercase letter');
    if (!/[a-z]/.test(password))
        errors.push('Password must contain at least one lowercase letter');
    if (!/[0-9]/.test(password))
        errors.push('Password must contain at least one digit');
    return { valid: errors.length === 0, errors };
}
