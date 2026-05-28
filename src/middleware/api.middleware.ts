import type { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";
import { ApiResponseHandler } from "../utils/apiResponse";

export interface PublicApiRequest extends Request {
    tenantId?: string;
}

export const requireApiKey = async (req: PublicApiRequest, res: Response, next: NextFunction) => {
    try {
        const apiKey = req.headers['x-api-key'] as string;

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
        next();
    } catch (error) {
        console.error("API Key Middleware Error:", error);
        return ApiResponseHandler.sendError(res, "Internal Server Error", 500);
    }
};