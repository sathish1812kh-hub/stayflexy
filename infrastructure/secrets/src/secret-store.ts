import * as https from 'https';
import * as http from 'http';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SecretOptions {
  /** How long to cache secret values in ms (default: 5 min) */
  cacheTtlMs?: number;
}

interface CacheEntry {
  value: string;
  expiresAt: number;
}

// Vault KV v2 response shape
interface VaultResponse {
  data: {
    data: Record<string, unknown>;
  };
}

// ─── SecretStore ──────────────────────────────────────────────────────────────

export class SecretStore {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly vaultAddr: string | null;
  private readonly vaultToken: string | null;
  private readonly DEFAULT_CACHE_TTL_MS = 5 * 60 * 1_000;

  constructor(private readonly options: SecretOptions = {}) {
    this.vaultAddr = process.env['VAULT_ADDR'] ?? null;
    this.vaultToken = process.env['VAULT_TOKEN'] ?? null;
  }

  // ── isVaultAvailable ───────────────────────────────────────────────────────

  isVaultAvailable(): boolean {
    return this.vaultAddr !== null && this.vaultToken !== null;
  }

  // ── get ────────────────────────────────────────────────────────────────────

  async get(secretPath: string): Promise<string> {
    const cacheTtlMs = this.options.cacheTtlMs ?? this.DEFAULT_CACHE_TTL_MS;
    const now = Date.now();
    const cached = this.cache.get(secretPath);

    if (cached !== undefined && now < cached.expiresAt) {
      return cached.value;
    }

    let value: string;

    if (this.isVaultAvailable()) {
      value = await this.fetchFromVault(secretPath);
    } else {
      const envKey = secretPath
        .split('/')
        .pop()
        ?.toUpperCase()
        .replace(/-/g, '_');

      if (envKey === undefined || envKey.length === 0) {
        throw new Error(`Invalid secret path: "${secretPath}"`);
      }

      const envValue = process.env[envKey];
      if (envValue === undefined) {
        throw new Error(
          `Secret "${secretPath}" not found in Vault or environment variable "${envKey}"`,
        );
      }
      value = envValue;
    }

    this.cache.set(secretPath, { value, expiresAt: now + cacheTtlMs });
    return value;
  }

  // ── fetchFromVault ─────────────────────────────────────────────────────────

  private fetchFromVault(secretPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const vaultAddr = this.vaultAddr as string;
      const vaultToken = this.vaultToken as string;

      const vaultUrl = new URL(
        `/v1/secret/data/${secretPath}`,
        vaultAddr,
      );

      const requestOptions: https.RequestOptions = {
        method: 'GET',
        headers: {
          'X-Vault-Token': vaultToken,
          'Content-Type': 'application/json',
        },
      };

      const protocol = vaultUrl.protocol === 'https:' ? https : http;

      const req = protocol.request(vaultUrl, requestOptions, (res) => {
        const chunks: Buffer[] = [];

        res.on('data', (chunk: Buffer) => chunks.push(chunk));

        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf-8');

          if (res.statusCode === undefined || res.statusCode < 200 || res.statusCode >= 300) {
            reject(
              new Error(
                `Vault request failed with status ${res.statusCode ?? 'unknown'}: ${body}`,
              ),
            );
            return;
          }

          try {
            const parsed = JSON.parse(body) as VaultResponse;
            const leafKey = secretPath.split('/').pop() ?? '';
            const value = parsed.data.data[leafKey];

            if (typeof value !== 'string') {
              reject(
                new Error(
                  `Vault secret "${secretPath}" did not return a string value`,
                ),
              );
              return;
            }

            resolve(value);
          } catch (err) {
            reject(
              new Error(`Failed to parse Vault response: ${String(err)}`),
            );
          }
        });
      });

      req.on('error', (err: Error) => {
        reject(new Error(`Vault HTTP request failed: ${err.message}`));
      });

      req.end();
    });
  }

  // ── rotate ─────────────────────────────────────────────────────────────────

  async rotate(secretPath: string, newValue: string): Promise<void> {
    if (!this.isVaultAvailable()) {
      throw new Error(
        'Secret rotation requires Vault. Set VAULT_ADDR and VAULT_TOKEN.',
      );
    }

    const vaultAddr = this.vaultAddr as string;
    const vaultToken = this.vaultToken as string;

    await new Promise<void>((resolve, reject) => {
      const vaultUrl = new URL(
        `/v1/secret/data/${secretPath}`,
        vaultAddr,
      );

      const leafKey = secretPath.split('/').pop() ?? secretPath;
      const body = JSON.stringify({ data: { [leafKey]: newValue } });

      const requestOptions: https.RequestOptions = {
        method: 'POST',
        headers: {
          'X-Vault-Token': vaultToken,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      };

      const protocol = vaultUrl.protocol === 'https:' ? https : http;

      const req = protocol.request(vaultUrl, requestOptions, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const responseBody = Buffer.concat(chunks).toString('utf-8');
          if (res.statusCode === undefined || res.statusCode < 200 || res.statusCode >= 300) {
            reject(
              new Error(
                `Vault rotate failed with status ${res.statusCode ?? 'unknown'}: ${responseBody}`,
              ),
            );
          } else {
            resolve();
          }
        });
      });

      req.on('error', (err: Error) => {
        reject(new Error(`Vault rotate request failed: ${err.message}`));
      });

      req.write(body);
      req.end();
    });

    // Clear cache so the next get() fetches the new value
    this.cache.delete(secretPath);
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createSecretStore(options?: SecretOptions): SecretStore {
  return new SecretStore(options);
}
