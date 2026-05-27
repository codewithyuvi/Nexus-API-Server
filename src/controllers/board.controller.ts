import {prisma} from "../utils/prisma";
import { ApiResponseHandler } from "../utils/apiResponse";
import type { AuthRequest } from "../middleware/auth.middleware";
import type { Request, Response } from "express";

// POST /api/boards 
export const createBoard = async (req: Request, res: Response) => {
    try {
        const authReq = req as unknown as AuthRequest;
        const tenantId = (authReq.auth.orgId || (authReq.auth.claims as any)?.o?.id) as string;
        const { name, description } = req.body;
        if (!name) {
            return ApiResponseHandler.sendError(res, "Board name is required", 400);
        }
        // Create a URL-friendly slug (e.g., "Feature Requests" -> "feature-requests")
        let slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        
        // Ensure slug is unique per tenant by appending a random string
        slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
        const newBoard = await prisma.board.create({
            data: {
                tenantId,
                name,
                description,
                slug
            }
        });
        return ApiResponseHandler.sendSuccess(res, newBoard);
    } catch (error) {
        console.error("Create Board Error:", error);
        return ApiResponseHandler.sendError(res, "Failed to create board", 500);
    }
};



// GET /api/boards
export const getBoards = async (req: Request, res: Response) => {
    
    try {
        const authReq = req as unknown as AuthRequest;
        const tenantId = authReq.auth.orgId as string;
    
        const boards = await prisma.board.findMany({
            where: {tenantId: tenantId},
            orderBy: {createdAt: 'desc'}
        });

        return ApiResponseHandler.sendSuccess(res, boards);
    } catch (error) {
        console.log("Get boards error:", error);
        return ApiResponseHandler.sendError(res, "Failed to fetch boards", 500);
    }

}

