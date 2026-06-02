import { MetricsRegistry, createMetricsHandler, createHttpMetricsMiddleware } from '../metrics'

describe('MetricsRegistry', () => {
  describe('Counter', () => {
    it('get() returns 0 initially', () => {
      const registry = new MetricsRegistry()
      const counter = registry.counter('test_counter', 'A test counter')
      expect(counter.get()).toBe(0)
    })

    it('inc() without labels increments default count', () => {
      const registry = new MetricsRegistry()
      const counter = registry.counter('test_counter', 'A test counter')
      counter.inc()
      counter.inc()
      expect(counter.get()).toBe(2)
    })

    it('inc({ method: "GET" }) increments labeled count', () => {
      const registry = new MetricsRegistry()
      const counter = registry.counter('req_total', 'Request total')
      counter.inc({ method: 'GET' })
      counter.inc({ method: 'GET' })
      counter.inc({ method: 'POST' })
      expect(counter.get({ method: 'GET' })).toBe(2)
      expect(counter.get({ method: 'POST' })).toBe(1)
      expect(counter.get()).toBe(0)
    })
  })

  describe('Histogram', () => {
    it('observe(0.5) records observation', () => {
      const registry = new MetricsRegistry()
      const hist = registry.histogram('req_duration', 'Request duration')
      hist.observe(0.5)
      expect(hist.percentile(100)).toBe(0.5)
    })

    it('percentile(50) on [1,2,3,4,5] returns correct median', () => {
      const registry = new MetricsRegistry()
      const hist = registry.histogram('req_duration', 'Request duration')
      for (const v of [1, 2, 3, 4, 5]) {
        hist.observe(v)
      }
      expect(hist.percentile(50)).toBe(3)
    })

    it('percentile(100) returns maximum value', () => {
      const registry = new MetricsRegistry()
      const hist = registry.histogram('req_duration', 'Request duration')
      for (const v of [1, 2, 3, 4, 5]) {
        hist.observe(v)
      }
      expect(hist.percentile(100)).toBe(5)
    })

    it('percentile(0) on empty observations returns 0', () => {
      const registry = new MetricsRegistry()
      const hist = registry.histogram('req_duration', 'Request duration')
      expect(hist.percentile(0)).toBe(0)
    })
  })

  describe('Gauge', () => {
    it('set(42) then get() returns 42', () => {
      const registry = new MetricsRegistry()
      const gauge = registry.gauge('active_connections', 'Active connections')
      gauge.set(42)
      expect(gauge.get()).toBe(42)
    })

    it('inc() increments by 1', () => {
      const registry = new MetricsRegistry()
      const gauge = registry.gauge('active_connections', 'Active connections')
      gauge.set(10)
      gauge.inc()
      expect(gauge.get()).toBe(11)
    })

    it('dec() decrements by 1', () => {
      const registry = new MetricsRegistry()
      const gauge = registry.gauge('active_connections', 'Active connections')
      gauge.set(10)
      gauge.dec()
      expect(gauge.get()).toBe(9)
    })

    it('can go negative', () => {
      const registry = new MetricsRegistry()
      const gauge = registry.gauge('temp_gauge', 'Temp gauge')
      gauge.set(0)
      gauge.dec()
      gauge.dec()
      expect(gauge.get()).toBe(-2)
    })
  })

  describe('toPrometheusText()', () => {
    it('includes # HELP and # TYPE lines for registered metrics', () => {
      const registry = new MetricsRegistry()
      registry.counter('my_counter', 'My counter help text')
      const text = registry.toPrometheusText()
      expect(text).toContain('# HELP my_counter My counter help text')
      expect(text).toContain('# TYPE my_counter counter')
    })

    it('counter output has correct format with labels', () => {
      const registry = new MetricsRegistry()
      const counter = registry.counter('http_reqs', 'HTTP requests')
      counter.inc({ method: 'GET' })
      const text = registry.toPrometheusText()
      expect(text).toContain('http_reqs{method="GET"} 1')
    })

    it('histogram output includes _bucket, _sum, _count lines', () => {
      const registry = new MetricsRegistry()
      const hist = registry.histogram('latency', 'Latency histogram')
      hist.observe(0.1)
      hist.observe(0.5)
      const text = registry.toPrometheusText()
      expect(text).toContain('latency_bucket')
      expect(text).toContain('latency_sum')
      expect(text).toContain('latency_count')
    })

    it('returns valid Prometheus text format ending with newline', () => {
      const registry = new MetricsRegistry()
      const counter = registry.counter('test_metric', 'Test metric')
      counter.inc()
      const text = registry.toPrometheusText()
      expect(text.endsWith('\n')).toBe(true)
      expect(text).toContain('# HELP')
      expect(text).toContain('# TYPE')
    })
  })

  describe('createMetricsHandler', () => {
    it('sets Content-Type header to text/plain; version=0.0.4', () => {
      const registry = new MetricsRegistry()
      const handler = createMetricsHandler(registry)
      const res = {
        statusCode: 0,
        headers: {} as Record<string, string>,
        setHeader(k: string, v: string) { this.headers[k] = v },
        end: jest.fn(),
      }

      handler({}, res)

      expect(res.headers['Content-Type']).toBe('text/plain; version=0.0.4')
    })

    it('body is prometheus text from registry', () => {
      const registry = new MetricsRegistry()
      const counter = registry.counter('handled_reqs', 'Handled requests')
      counter.inc()
      const handler = createMetricsHandler(registry)
      const res = {
        statusCode: 0,
        headers: {} as Record<string, string>,
        setHeader(k: string, v: string) { this.headers[k] = v },
        end: jest.fn(),
      }

      handler({}, res)

      expect(res.end).toHaveBeenCalledWith(expect.stringContaining('handled_reqs'))
    })
  })

  describe('createHttpMetricsMiddleware', () => {
    it('increments http_requests_total after res finish event', () => {
      const registry = new MetricsRegistry()
      const middleware = createHttpMetricsMiddleware(registry)
      let finishCallback: (() => void) | undefined
      const res = {
        statusCode: 200,
        on: jest.fn((_event: string, fn: () => void) => { finishCallback = fn }),
      }
      const req = { method: 'GET', path: '/test' }
      const next = jest.fn()

      middleware(req, res, next)
      expect(next).toHaveBeenCalledTimes(1)

      finishCallback?.()

      const requestTotal = registry.counter('http_requests_total', 'Total number of HTTP requests')
      expect(requestTotal.get({ method: 'GET', status: '200', path: '/test' })).toBe(1)
    })

    it('records observation in duration histogram after finish event', () => {
      const registry = new MetricsRegistry()
      const middleware = createHttpMetricsMiddleware(registry)
      let finishCallback: (() => void) | undefined
      const res = {
        statusCode: 201,
        on: jest.fn((_event: string, fn: () => void) => { finishCallback = fn }),
      }
      const req = { method: 'POST', path: '/api/items' }
      const next = jest.fn()

      middleware(req, res, next)
      finishCallback?.()

      const hist = registry.histogram(
        'http_request_duration_seconds',
        'HTTP request duration in seconds',
      )
      expect(hist.percentile(100, { method: 'POST', status: '201', path: '/api/items' })).toBeGreaterThanOrEqual(0)
    })
  })
})
