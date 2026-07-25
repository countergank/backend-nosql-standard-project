import { IncomingMessage, ServerResponse } from 'node:http';
import { Injectable, NestMiddleware } from '@nestjs/common';

interface FastifyIncomingMessage extends IncomingMessage {
  id?: string;
}

@Injectable()
export class TraceIdMiddleware implements NestMiddleware {
  use(req: IncomingMessage, res: ServerResponse, next: () => void): void {
    const traceId = (req as FastifyIncomingMessage).id || 'unknown';
    res.setHeader('x-trace-id', traceId);
    next();
  }
}
