import { prisma } from "../utils/prisma";
import { ApiResponseHandler } from "../utils/apiResponse";
import type { PublicApiRequest } from "../middleware/api.middleware";
import type { Response, Request } from "express";
import { dispatchWebhook } from "../queues/outboundWebhook.queue";
import {io} from "../index";

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
                    orderBy: { createdAt: 'desc' },
                    include: {
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
        const newPost = await prisma.post.create({
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
        io.to(boardId).emit("post-created", newPost);

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

        const existingVote = await prisma.upvote.findUnique({
            where: { postId_authorId: { postId, authorId } }
        });

        const post = await prisma.post.findUnique({ where: { id: postId }, select: { boardId: true } });
        if (!post) return ApiResponseHandler.sendError(res, "Post not found", 404);

        if (existingVote) {
            await prisma.upvote.delete({ where: { id: existingVote.id } });
            io.to(post.boardId).emit("post-upvoted", { postId, increment: -1 });
            return ApiResponseHandler.sendSuccess(res, { voted: false });
        } else {
            await prisma.upvote.create({
                data: { tenantId, postId, authorId }
            });
            io.to(post.boardId).emit("post-upvoted", { postId, increment: 1 });
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

        const post = await prisma.post.findUnique({ where: { id: postId }, select: { boardId: true } });
        if (!post) return ApiResponseHandler.sendError(res, "Post not found", 404);

        const newComment = await prisma.comment.create({
            data: {
                tenantId,
                postId,
                content,
                authorId,
                authorName,
                isInternal: false // Since this comes from the Public API, it is NOT an internal team note
            }
        });

        io.to(post.boardId).emit("comment-created", { postId, comment: newComment });

        return ApiResponseHandler.sendSuccess(res, newComment);
    } catch (error) {
        console.error("Create Public Comment Error:", error);
        return ApiResponseHandler.sendError(res, "Failed to submit comment", 500);
    }
};