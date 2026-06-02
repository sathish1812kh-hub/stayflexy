import { BaseService } from "@lib/baseService";
import { hashPassword, verifyPassword } from "../utils/password";
import { generateSecureHex } from "../utils/crypto";
import { hashToken } from "../utils/crypto";
import { RESET_TOKEN_EXPIRY_MINUTES } from "../constants";

export interface PasswordResetTokenData {
  plaintext: string;
  hash: string;
  expiresAt: Date;
}

export class PasswordService extends BaseService {
  protected readonly moduleName = "PasswordService";

  async hash(password: string): Promise<string> {
    return this.execute("hash", () => hashPassword(password));
  }

  async verify(plaintext: string, hash: string): Promise<boolean> {
    return this.execute("verify", () => verifyPassword(plaintext, hash));
  }

  generateResetToken(): PasswordResetTokenData {
    const plaintext = generateSecureHex(32);
    const hash = hashToken(plaintext);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);
    return { plaintext, hash, expiresAt };
  }
}
