import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Logger } from 'src/utils/utils';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      Logger.getInstance().log(`${req.method} ${req.originalUrl} - ${res.statusCode} [${duration}ms]`);
    });

    next();
  }
}
