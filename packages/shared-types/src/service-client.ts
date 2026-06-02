import * as http from 'http'
import * as https from 'https'

export interface ServiceClientOptions {
  baseUrl: string
  serviceKey: string
  timeoutMs?: number
  maxRetries?: number
  retryDelayMs?: number
}

export interface ServiceRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  body?: unknown
  correlationId?: string
  organizationId?: string
  userId?: string
  userRole?: string
}

export class ServiceClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody: unknown,
  ) {
    super(message)
    this.name = 'ServiceClientError'
  }
}

/**
 * Lightweight HTTP client for service-to-service calls.
 * Propagates correlation ID, auth headers, and service key.
 * Retries transient 5xx and network errors with exponential backoff.
 */
export class ServiceHttpClient {
  private readonly timeoutMs: number
  private readonly maxRetries: number
  private readonly retryDelayMs: number

  constructor(private readonly options: ServiceClientOptions) {
    this.timeoutMs = options.timeoutMs ?? 10_000
    this.maxRetries = options.maxRetries ?? 3
    this.retryDelayMs = options.retryDelayMs ?? 200
  }

  async request<T>(opts: ServiceRequestOptions): Promise<T> {
    const method = opts.method ?? 'GET'
    let lastError: unknown

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.doRequest<T>(method, opts)
      } catch (err) {
        lastError = err
        if (err instanceof ServiceClientError && err.statusCode < 500) {
          throw err // non-retryable: 4xx client errors
        }
        if (attempt < this.maxRetries) {
          await this.sleep(this.retryDelayMs * Math.pow(2, attempt - 1))
        }
      }
    }

    throw lastError
  }

  async get<T>(path: string, opts: Omit<ServiceRequestOptions, 'method' | 'path'> = {}): Promise<T> {
    return this.request<T>({ ...opts, method: 'GET', path })
  }

  async post<T>(path: string, body: unknown, opts: Omit<ServiceRequestOptions, 'method' | 'path' | 'body'> = {}): Promise<T> {
    return this.request<T>({ ...opts, method: 'POST', path, body })
  }

  async patch<T>(path: string, body: unknown, opts: Omit<ServiceRequestOptions, 'method' | 'path' | 'body'> = {}): Promise<T> {
    return this.request<T>({ ...opts, method: 'PATCH', path, body })
  }

  private doRequest<T>(method: string, opts: ServiceRequestOptions): Promise<T> {
    const url = new URL(opts.path, this.options.baseUrl)
    const lib: typeof https = url.protocol === 'https:' ? https : (http as unknown as typeof https)

    const bodyStr = opts.body !== undefined ? JSON.stringify(opts.body) : undefined
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Service-Key': this.options.serviceKey,
    }
    if (opts.correlationId) headers['X-Correlation-Id'] = opts.correlationId
    if (opts.organizationId) headers['X-Organization-Id'] = opts.organizationId
    if (opts.userId) headers['X-User-Id'] = opts.userId
    if (opts.userRole) headers['X-User-Role'] = opts.userRole
    if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr).toString()

    return new Promise<T>((resolve, reject) => {
      const req = lib.request(
        {
          hostname: url.hostname,
          port: url.port ? parseInt(url.port, 10) : (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname + url.search,
          method,
          headers,
          timeout: this.timeoutMs,
        },
        (res) => {
          const chunks: Buffer[] = []
          res.on('data', (c: Buffer) => chunks.push(c))
          res.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf-8')
            let parsed: unknown
            try { parsed = JSON.parse(raw) } catch { parsed = raw }
            const status = res.statusCode ?? 0
            if (status >= 200 && status < 300) {
              resolve(parsed as T)
            } else {
              reject(new ServiceClientError(
                `Service call failed: ${method} ${url.pathname} → ${status}`,
                status,
                parsed,
              ))
            }
          })
          res.on('error', reject)
        },
      )

      req.on('timeout', () => {
        req.destroy()
        reject(new ServiceClientError(`Service call timed out: ${method} ${url.pathname}`, 408, null))
      })
      req.on('error', reject)

      if (bodyStr) req.write(bodyStr)
      req.end()
    })
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms))
  }
}
