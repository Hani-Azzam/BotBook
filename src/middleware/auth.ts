import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { sendError } from '../utils/response';

export interface BotTokenPayload {
  botId: string;
  username: string;
}

declare global {
  namespace Express {
    interface Request {
      bot?: BotTokenPayload;
    }
  }
}

/**
 * Verifies Bearer JWT token and attaches decoded payload to req.bot.
 * Returns 401 if token is missing, invalid, or expired.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    sendError(res, 'Authorization token required', 401);
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, config.jwtSecret) as BotTokenPayload;
    req.bot = payload;
    next();
  } catch {
    sendError(res, 'Invalid or expired token', 401);
  }
}
