import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import type { StrictAuthProp } from '@clerk/clerk-sdk-node';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { withTenant } from '../utils/prisma';

export type AuthRequest = Request & StrictAuthProp & {
  auth: {
    orgId?: string;
    userId?: string;
    claims?: any;
  };
  prisma: ReturnType<typeof withTenant>;
};

export const requireAuth: RequestHandler = (req, res, next) => {
  // @ts-ignore - Ignore the internal version conflict
  const clerkMiddleware = ClerkExpressRequireAuth({});
  
  // Execute the middleware
  clerkMiddleware(req as any, res as any, (err?: any) => {
    if (err) return next(err);
    
    // Inject the tenant-scoped Prisma client
    const authReq = req as unknown as AuthRequest;
    const tenantId = authReq.auth.orgId || authReq.auth.claims?.o?.id;
    
    if (tenantId) {
      authReq.prisma = withTenant(tenantId);
    }
    
    next();
  });
};