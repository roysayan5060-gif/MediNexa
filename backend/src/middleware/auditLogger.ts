import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { AuditLog } from '../models/AuditLog';

export const logAuditEvent = async (
  req: AuthenticatedRequest,
  action: string,
  resource: string,
  resourceId?: string,
  details?: Record<string, any>
): Promise<void> => {
  try {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    await AuditLog.create({
      userId: req.user?._id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action,
      resource,
      resourceId,
      ipAddress,
      userAgent,
      details,
      timestamp: new Date(),
    });
  } catch (err: any) {
    // Non-blocking error logging for audit logs so main business logic does not fail
    console.error('[AuditLog Error]: Failed to write audit log:', err.message);
  }
};

export const auditMiddleware = (action: string, resource: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // Call logAuditEvent after response finishes or in-flight
    res.on('finish', () => {
      if (res.statusCode < 400) {
        const resourceId = req.params.id || req.params.patientId || (res.locals && res.locals.resourceId);
        logAuditEvent(req, action, resource, resourceId, {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
        });
      }
    });
    next();
  };
};
