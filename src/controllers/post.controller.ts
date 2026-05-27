import { prisma } from "../utils/prisma";
import { ApiResponseHandler } from "../utils/apiResponse";
import type { AuthRequest } from "../middleware/auth.middleware";
import type { Request, Response } from "express";

export const getPosts = async (req: Request, res: Response) => {
    try {
        const authReq = req as unknown as AuthRequest;
        const tenantId = (authReq.auth.orgId || (authReq.auth.claims as any)?.o?.id) as string;
        const boardId = req.params.boardId as string;

        const posts = await prisma.post.findMany({
            where: { tenantId, boardId },
            orderBy: { createdAt: 'desc' }
        });

        return ApiResponseHandler.sendSuccess(res, posts);
    } catch (error) {
        console.error("Get Posts Error:", error);
        return ApiResponseHandler.sendError(res, "Failed to fetch posts", 500);
    }
};

export const createPost = async (req: Request, res: Response) => {
    try {
        const authReq = req as unknown as AuthRequest;
        const tenantId = (authReq.auth.orgId || (authReq.auth.claims as any)?.o?.id) as string;
        const userId = authReq.auth.userId;
        
        const boardId = req.params.boardId as string;
        const { title, description } = req.body;

        if (!title || !description) {
            return ApiResponseHandler.sendError(res, "Title and description are required", 400);
        }

        const newPost = await prisma.post.create({
            data: {
                tenantId,
                boardId,
                title,
                description,
                authorId: userId,
            }
        });

        return ApiResponseHandler.sendSuccess(res, newPost);
    } catch (error) {
        console.error("Create Post Error:", error);
        return ApiResponseHandler.sendError(res, "Failed to create post", 500);
    }
};