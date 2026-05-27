import type { Request ,Response, NextFunction } from "express";
import type { AuthRequest } from "./auth.middleware";
import { fgaClient } from "../utils/openfga";
import { ApiResponseHandler } from "../utils/apiResponse";

// This middleware factory lets us protect routes dynamically, e.g. requireFgaRole('admin')
export const requireFgaRole = (relation: 'admin' | 'member') => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authReq = req as unknown as AuthRequest;
            const userId = authReq.auth.userId;
            const tenantId = authReq.auth.orgId || (authReq.auth.claims?.o as any)?.id;
            
            
            if(!userId || !tenantId){
                return ApiResponseHandler.sendError(res, "Missing user id or active org", 401);
            }

            // ask openfga the ultimate question
            const {allowed} = await fgaClient.check({
                user:  `user:${userId}`,
                relation: relation.toLowerCase(), // 'admin' or 'member'
                object: `tenant:${tenantId}`,
            })

            if (!allowed) {
                return ApiResponseHandler.sendError(res, "Forbidden: You do not have permission to do this", 403);
            }

            next();
        } catch (error) {
            console.error("FGA Check Error:", error);
            return ApiResponseHandler.sendError(res, "Internal Authorization Error", 500);
        }
    }
}