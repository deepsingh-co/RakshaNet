import type { NextFunction, Request, Response } from 'express';
import type { Role } from '../models/User.js';

/**
 * Role guard. Roles are explicit — a guardian has no implicit admin
 * access. Unknown/absent role always fails closed.
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.auth?.role;
    if (!role || !roles.includes(role)) {
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You do not have permission to perform this action' },
      });
      return;
    }
    next();
  };
}
