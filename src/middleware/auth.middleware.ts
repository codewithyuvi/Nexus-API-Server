import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import type { StrictAuthProp } from '@clerk/clerk-sdk-node';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

export type AuthRequest = Request & StrictAuthProp & {
  auth: {
    orgId?: string;
  }
};

export const requireAuth: RequestHandler = (req, res, next) => {
  // @ts-ignore - Ignore the internal version conflict
  const clerkMiddleware = ClerkExpressRequireAuth({});
  
  // Execute the middleware
  clerkMiddleware(req as any, res as any, next);
};