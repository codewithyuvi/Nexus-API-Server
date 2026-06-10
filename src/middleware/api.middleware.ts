import type { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";
import { ApiResponseHandler } from "../utils/apiResponse";
import { redisClient } from "../utils/redis";

export interface PublicApiRequest extends Request {
    tenantId?: string;
}

export const requireApiKey = async (req: PublicApiRequest, res: Response, next: NextFunction) => {
    try {
        const apiKey = req.headers['nexus-api-key'] as string;

        if (!apiKey) {
            return ApiResponseHandler.sendError(res, "Missing x-api-key header", 401);
        }

        const foundKey = await prisma.apiKey.findUnique({
            where: { key: apiKey }
        });

        if (!foundKey) {
            return ApiResponseHandler.sendError(res, "Invalid API Key", 401);
        }

        // Securely attach the Tenant ID to the request!
        req.tenantId = foundKey.tenantId;

        // Wallet Paywall Logic
        const creditKey = `credits:${foundKey.tenantId}`;
        const usageKey = `usage:${foundKey.tenantId}`;

        //Check Redis Cache First
        let creditsStr  = await redisClient.get(creditKey);

        //cache miss? fetch from postgres and seed the cache
        if(creditsStr  === null){
            const tenant = await prisma.tenant.findUnique({
                where: {id: foundKey.tenantId},
                select: {apiCredits: true}
            })

            if(!tenant) return ApiResponseHandler.sendError(res, "Tenant not found", 404);
            
            creditsStr = tenant.apiCredits.toString();

            await redisClient.set(creditKey, creditsStr);
        }

        const currentCredits = parseInt(creditsStr, 10);

        //paywall
        if(currentCredits <=0 ){
            return ApiResponseHandler.sendError(res, "402 Payment Required: You have 0 API credits remaining. Please take more tokens");
        }

        await redisClient.decr(creditKey);
        await redisClient.incr(usageKey);
        next();
    } catch (error) {
        console.error("API Key Middleware Error:", error);
        return ApiResponseHandler.sendError(res, "Internal Server Error", 500);
    }
};