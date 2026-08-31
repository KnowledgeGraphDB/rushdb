import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable } from 'rxjs'
import { map, catchError } from 'rxjs/operators'

import { MetricsService } from './metrics.service'

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest()
    const route: unknown = req?.route?.path ?? req?.url ?? 'unknown'
    const method = req?.method ?? 'GET'
    const skip = typeof route === 'string' && (route === '/metrics' || route === '/health')
    const end = skip ? undefined : this.metrics.startTimer()
    const done = (status: number) => {
      if (skip) {
        return
      }
      this.metrics.incStatus(status)
      end?.({ method, route: String(route) })
    }

    return next.handle().pipe(
      map((value) => {
        done(context.switchToHttp().getResponse().statusCode || 200)
        return value
      }),
      catchError((err: unknown) => {
        done(
          (
            typeof err === 'object' &&
              err !== null &&
              'status' in err &&
              typeof (err as { status?: unknown }).status === 'number'
          ) ?
            (err as { status: number }).status
          : 500
        )
        throw err
      })
    )
  }
}
