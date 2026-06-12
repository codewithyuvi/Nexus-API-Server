import { prisma } from "../utils/prisma";
import { ApiResponseHandler } from "../utils/apiResponse";
import type { PublicApiRequest } from "../middleware/api.middleware";
import type { Response, Request } from "express";
import { dispatchWebhook } from "../queues/outboundWebhook.queue";
import { getIO } from "../utils/socket";

// GET /api/v1/public/boards/:slug
export const getPublicBoard = async (req: Request, res: Response) => {
    try {
        const publicReq = req as unknown as PublicApiRequest;
        const tenantId = publicReq.tenantId as string;
        const slug = req.params.slug as string;

        // RLS intercepts this and magically appends `AND tenantId = ...`
        // Because of RLS, we do NOT use findUnique, we use findFirst because we don't have a compound index on just slug. Wait, actually we have @@unique([tenantId, slug]), so findFirst is perfectly fast!
        const board = await publicReq.prisma!.board.findFirst({
            where: { slug },
            include: {
                posts: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        upvotes: { select: { authorId: true } },
                        _count: {
                            select: { upvotes: true, comments: true }
                        }
                    }
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

        console.log("Before new post");
        // RLS auto-injects tenantId, but TypeScript requires it here!
        const newPost = await publicReq.prisma!.post.create({
            data: {
                tenantId,
                boardId,
                title,
                description,
                authorId 
            }
        });
        
        // I do not 'await' this! I drop it in the queue and instantly return the API response to the user so they don't have to wait for the webhook to send.
        dispatchWebhook(tenantId, 'post.created', newPost);
        console.log("webhoook sent");

        //boardcast to everyone who has joind that board.
        getIO().to(boardId).emit("post-created", newPost);

        return ApiResponseHandler.sendSuccess(res, newPost);
    } catch (error) {
        console.error("Create Public Post Error:", error);
        return ApiResponseHandler.sendError(res, "Failed to submit post", 500);
    }
};

export const publicUpvotePost = async (req: Request, res: Response) => {
    try {
        const publicReq = req as unknown as PublicApiRequest;
        const tenantId = publicReq.tenantId as string;
        const postId = req.params.postId as string;
        const { authorId } = req.body;

        if (!authorId) {
            return ApiResponseHandler.sendError(res, "authorId is required to upvote", 400);
        }

        // RLS Extension auto-injects tenantId
        const existingVote = await publicReq.prisma!.upvote.findFirst({
            where: { postId, authorId }
        });

        const post = await publicReq.prisma!.post.findFirst({ where: { id: postId }, select: { boardId: true } });
        if (!post) return ApiResponseHandler.sendError(res, "Post not found", 404);

        if (existingVote) {
            await publicReq.prisma!.upvote.delete({ where: { id: existingVote.id } });
            getIO().to(post.boardId).emit("post-upvoted", { postId, increment: -1, authorId });
            return ApiResponseHandler.sendSuccess(res, { voted: false });
        } else {
            await publicReq.prisma!.upvote.create({
                data: { tenantId, postId, authorId }
            });
            getIO().to(post.boardId).emit("post-upvoted", { postId, increment: 1, authorId });
            return ApiResponseHandler.sendSuccess(res, { voted: true });
        }
    } catch (error) {
        console.error("Public Upvote Error:", error);
        return ApiResponseHandler.sendError(res, "Failed to toggle upvote", 500);
    }
};

// POST /api/v1/public/posts/:postId/comments
export const createPublicComment = async (req: Request, res: Response) => {
    try {
        const publicReq = req as unknown as PublicApiRequest;
        const tenantId = publicReq.tenantId as string;
        const postId = req.params.postId as string;
        const { content, authorId, authorName } = req.body;

        if (!content || !authorId) {
            return ApiResponseHandler.sendError(res, "content and authorId are required", 400);
        }

        const post = await publicReq.prisma!.post.findFirst({ where: { id: postId }, select: { boardId: true } });
        if (!post) return ApiResponseHandler.sendError(res, "Post not found", 404);

        const newComment = await publicReq.prisma!.comment.create({
            data: {
                tenantId,
                postId,
                content,
                authorId,
                authorName,
                isInternal: false // Since this comes from the Public API, it is NOT an internal team note
            }
        });

        getIO().to(post.boardId).emit("comment-created", { postId, comment: newComment });

        return ApiResponseHandler.sendSuccess(res, newComment);
    } catch (error) {
        console.error("Create Public Comment Error:", error);
        return ApiResponseHandler.sendError(res, "Failed to submit comment", 500);
    }
};

// GET /api/v1/public/posts/:postId/comments
export const getPublicComments = async (req: Request, res: Response) => {
    try {
        const publicReq = req as unknown as PublicApiRequest;
        const postId = req.params.postId as string;

        // Fetch non-internal comments
        const comments = await publicReq.prisma!.comment.findMany({
            where: { postId, isInternal: false },
            orderBy: { createdAt: 'asc' }
        });

        return ApiResponseHandler.sendSuccess(res, comments);
    } catch (error) {
        console.error("Get Public Comments Error:", error);
        return ApiResponseHandler.sendError(res, "Failed to fetch comments", 500);
    }
};