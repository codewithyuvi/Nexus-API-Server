import type { NextFunction, Request, Response } from "express";
import { redisClient } from "../utils/redis";
import type { AuthRequest } from "./auth.middleware";

export const trackApiUsage = async (req: Request, res: Response, next: NextFunction) => {
    try {

        const authReq = req as unknown as AuthRequest;
        const tenantId = (req as any).tenantId || authReq.auth?.orgId || (authReq.auth?.claims as any)?.o?.id;
        
        if(tenantId){
            const redisKey = `usage:${tenantId}`;
            await redisClient.incr(redisKey);
            console.log(`Saved to redis ${redisKey}`);
        }
    } catch (error) {
        console.error("Redis Usage Tracking Error:", error);
    }

    next(); 
}