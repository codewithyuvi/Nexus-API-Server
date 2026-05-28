import { prisma } from "../utils/prisma";
import { ApiResponseHandler } from "../utils/apiResponse";
import type { PublicApiRequest } from "../middleware/api.middleware";
import type { Response, Request } from "express";
import type { PathUnknownErrorMessageResponse } from "@openfga/sdk";

// GET /api/v1/public/boards/:slug
export const getPublicBoard = async (req: Request, res: Response) => {
    try {
        const publicReq = req as unknown as PublicApiRequest;
        const tenantId = publicReq.tenantId as string;
        const slug = req.params.slug as string;

        const board = await prisma.board.findUnique({
            where: {
                tenantId_slug: { tenantId, slug } 
            },
            include: {
                posts: {
                    where: { status: "OPEN" }, // Only show open posts to the public
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!board) return ApiResponseHandler.sendError(res, "Board not found", 404);

        return ApiResponseHandler.sendSuccess(res, board);
    } catch (error) {
        console.error("Get Public Board Error:", error);
        return ApiResponseHandler.sendError(res, "Failed to fetch board", 500);
    }
};

// POST /api/v1/public/boards/:boardId/posts
export const createPublicPost = async (req: Request, res: Response) => {
    try {
        const publicReq = req as unknown as PublicApiRequest;
        const tenantId = publicReq.tenantId as string;
        const boardId = req.params.boardId as string;
        const { title, description, authorId } = req.body; // authorId comes from the external customer!

        if (!title || !description || !authorId) {
            return ApiResponseHandler.sendError(res, "Title, description, and authorId are required", 400);
        }

        const newPost = await prisma.post.create({
            data: {
                tenantId,
                boardId,
                title,
                description,
                authorId 
            }
        });

        return ApiResponseHandler.sendSuccess(res, newPost);
    } catch (error) {
        console.error("Create Public Post Error:", error);
        return ApiResponseHandler.sendError(res, "Failed to submit post", 500);
    }
};