import { prisma } from "../utils/prisma";
import { ApiResponseHandler } from "../utils/apiResponse";
import type { AuthRequest } from "../middleware/auth.middleware";
import type { Request, Response } from "express";
import crypto from "crypto"; 
import { auditLogsQueue } from "../queues/audit.queue";

// GET /api/keys
export const getKeys = async (req: Request, res: Response) => {
    try {
        const authReq = req as unknown as AuthRequest;
        const tenantId = (authReq.auth.orgId || (authReq.auth.claims as any)?.o?.id) as string;

        const keys = await prisma.apiKey.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' }
        });

        return ApiResponseHandler.sendSuccess(res, keys);
    } catch (error) {
        console.error("Get Keys Error:", error);
        return ApiResponseHandler.sendError(res, "Failed to fetch keys", 500);
    }
};

// POST /api/keys
export const generateKey = async (req: Request, res: Response) => {
    try {
        const authReq = req as unknown as AuthRequest;
        const tenantId = (authReq.auth.orgId || (authReq.auth.claims as any)?.o?.id) as string;

        // Generate a random 32-character hex string and prefix it with "nx_live_" (Nexus Live)
        const randomString = crypto.randomBytes(16).toString("hex");
        const rawKey = `nexus_live_${randomString}`;

        const newKey = await prisma.apiKey.create({
            data: {
                tenantId,
                key: rawKey
            }
        });

        await auditLogsQueue.add("logs", {
            tenantId,
            userId: authReq.auth.userId,
            action: "API_KEY_CREATED",
            entityId: newKey.id
        });

        return ApiResponseHandler.sendSuccess(res, newKey);
    } catch (error) {
        console.error("Generate Key Error:", error);
        return ApiResponseHandler.sendError(res, "Failed to generate API Key", 500);
    }
};

// DELETE /api/keys/:keyId
export const revokeKey = async (req: Request, res: Response) => {
    try {
        const authReq = req as unknown as AuthRequest;
        const tenantId = (authReq.auth.orgId || (authReq.auth.claims as any)?.o?.id) as string;
        const keyId = req.params.keyId as string;

        // Prisma checks both ID and tenantId to prevent someone from revoking another company's key
        await prisma.apiKey.delete({
            where: { id: keyId, tenantId } 
        });

        await auditLogsQueue.add("logs", {
            tenantId,
            userId: authReq.auth.userId,
            action: "API_KEY_REVOKED",
            entityId: keyId
        });

        return ApiResponseHandler.sendSuccess(res, { message: "API Key revoked" });
    } catch (error) {
        console.error("Revoke Key Error:", error);
        return ApiResponseHandler.sendError(res, "Failed to revoke key", 500);
    }
};