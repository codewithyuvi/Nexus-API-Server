import { prisma } from "../utils/prisma";
import { ApiResponseHandler } from "../utils/apiResponse";
import type { AuthRequest } from "../middleware/auth.middleware";
import type { Request, Response } from "express";

// POST /api/boards/:boardId/posts/:postId/comments
export const createComment = async (req: Request, res: Response) => {
    try {
        const authReq = req as unknown as AuthRequest;
        const tenantId = (authReq.auth.orgId || (authReq.auth.claims as any)?.o?.id) as string;
        const userId = authReq.auth.userId;
        const postId = req.params.postId as string;
        const { content, isInternal } = req.body;

        if (!content) {
            return ApiResponseHandler.sendError(res, "Content is required", 400);
        }

        const newComment = await prisma.comment.create({
            data: {
                tenantId,
                postId,
                authorId: userId,
                content,
                isInternal: isInternal || false
            }
        });

        return ApiResponseHandler.sendSuccess(res, newComment);
    } catch (error) {
        console.error("Create Comment Error:", error);
        return ApiResponseHandler.sendError(res, "Failed to add comment", 500);
    }
};

// DELETE /api/boards/:boardId/posts/:postId/comments/:commentId
export const deleteComment = async (req: Request, res: Response) => {
    try {
        const authReq = req as unknown as AuthRequest;
        const tenantId = (authReq.auth.orgId || (authReq.auth.claims as any)?.o?.id) as string;
        const commentId = req.params.commentId as string;

        await prisma.comment.delete({
            where: { id: commentId, tenantId }
        });

        return ApiResponseHandler.sendSuccess(res, { message: "Comment deleted" });
    } catch (error) {
        console.error("Delete Comment Error:", error);
        return ApiResponseHandler.sendError(res, "Failed to delete comment", 500);
    }
};
