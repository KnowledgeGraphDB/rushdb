import { Injectable, OnModuleInit } from '@nestjs/common'
import client from 'prom-client'

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly register = new client.Registry()
  private readonly httpRequestsTotal: client.Counter<string>
  private readonly httpRequestDuration: client.Histogram<string>

  constructor() {
    this.httpRequestsTotal = new client.Counter({
      name: 'rushdb_http_requests_total',
      help: 'Total HTTP requests by status class (200/300/400/500)',
      labelNames: ['status'],
      registers: [this.register]
    })
    this.httpRequestDuration = new client.Histogram({
      name: 'rushdb_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.register]
    })
  }

  onModuleInit() {
    // Node process metrics (heap, event loop, etc.) with a rushdb_ prefix.
    client.collectDefaultMetrics({ register: this.register, prefix: 'rushdb_' })
  }

  incStatus(status: number) {
    this.httpRequestsTotal.labels(String(Math.floor(status / 100) * 100)).inc()
  }

  startTimer() {
    return this.httpRequestDuration.startTimer()
  }

  async metrics(): Promise<string> {
    return this.register.metrics()
  }
}
