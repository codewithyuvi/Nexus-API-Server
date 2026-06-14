import { prisma } from "../utils/prisma";
import { ApiResponseHandler } from "../utils/apiResponse";
import type { Request, Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware";

// GET /api/dashboard/stats
export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const authReq = req as unknown as AuthRequest;
        const tenantId = authReq.auth.orgId || (authReq.auth.claims as any)?.o?.id;

        if (!tenantId) {
            return ApiResponseHandler.sendError(res, "Organization required", 401);
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId as string },
            select: { 
                apiCredits: true
            }
        });

        if (!tenant) {
            return ApiResponseHandler.sendError(res, "Tenant not found", 404);
        }

        // Count active boards
        const boardsCount = await prisma.board.count({
            where: { tenantId: tenantId as string }
        });

        // Total feedback = Posts + Comments
        const postsCount = await prisma.post.count({
            where: { tenantId: tenantId as string }
        });
        
        const commentsCount = await prisma.comment.count({
            where: { tenantId: tenantId as string }
        });

        const totalFeedback = postsCount + commentsCount;
        
        const completedRequests = await prisma.post.count({
            where: { tenantId: tenantId as string, status: "COMPLETED" }
        });

        const creditsRemaining = tenant.apiCredits; // Fallback to raw apiCredits as total wallet capacity

        return ApiResponseHandler.sendSuccess(res, { 
            completedRequests,
            creditsRemaining: creditsRemaining > 0 ? creditsRemaining : 0,
            activeBoards: boardsCount,
            totalFeedback
        });
    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        return ApiResponseHandler.sendError(res, "Failed to fetch dashboard stats", 500);
    }
};
