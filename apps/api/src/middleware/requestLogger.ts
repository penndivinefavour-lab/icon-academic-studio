import { Request, Response, NextFunction } from 'express';

/**
 * Log each request in development
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`
    );
  });

  next();
}

/**
 * Rate limiting placeholder (Phase 2)
 */
export function rateLimit(_req: Request, res: Response, next: NextFunction) {
  // Simple rate limit: 100 requests per minute per IP
  // This is a placeholder for Phase 2 implementation
  next();
}
