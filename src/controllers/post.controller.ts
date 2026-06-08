import { prisma } from "../utils/prisma";
import { ApiResponseHandler } from "../utils/apiResponse";
import type { AuthRequest } from "../middleware/auth.middleware";
import type { Request, Response } from "express";
import { auditLogsQueue } from "../queues/audit.queue";

// import { postQueue } from "../queues/post.queue";

export const getPosts = async (req: Request, res: Response) => {
  try {
    const authReq = req as unknown as AuthRequest;
    const tenantId = (authReq.auth.orgId ||
      (authReq.auth.claims as any)?.o?.id) as string;
    const boardId = req.params.boardId as string;

    if (!tenantId) {
      return ApiResponseHandler.sendError(
        res,
        "Organization context is missing",
        400,
      );
    }

    const posts = await prisma.post.findMany({
      where: { tenantId, boardId },
      orderBy: { createdAt: "desc" },
      include: {
        comments: { orderBy: { createdAt: "asc" } },
        _count: { select: { upvotes: true } },
      },
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
    const tenantId = (authReq.auth.orgId ||
      (authReq.auth.claims as any)?.o?.id) as string;
    const userId = authReq.auth.userId;

    const boardId = req.params.boardId as string;
    const { title, description } = req.body;

    if (!title || !description) {
      return ApiResponseHandler.sendError(
        res,
        "Title and description are required",
        400,
      );
    }

    const newPost = await prisma.post.create({
      data: {
        tenantId,
        boardId,
        title,
        description,
        authorId: userId,
      },
    });

    
    // await postQueue.add("create_dummy_comments", {tenantId, userId, newPost});

    // for (let i = 0; i < 500; i++) {
    //   await prisma.comment.create({
    //     data: {
    //       tenantId,
    //       authorId: userId,
    //       postId: newPost.id,
    //       content: `comment ${i}`,
    //       isInternal: false,
    //     },
    //   });
    // }


    // auditing logs
        await auditLogsQueue.add(
            'logs',
            {
                tenantId,
                userId: authReq.auth.userId,
                action: 'POST_CREATED',
                entityId: newPost.id,
                details: JSON.stringify({ Post_Title: newPost.title })
            }
        )
    return ApiResponseHandler.sendSuccess(res, newPost);
  } catch (error) {
    console.error("Create Post Error:", error);
    return ApiResponseHandler.sendError(res, "Failed to create post", 500);
  }
};

// DELETE /api/boards/:boardId/posts/:postId
export const deletePost = async (req: Request, res: Response) => {
  try {
    const authReq = req as unknown as AuthRequest;
    const tenantId = (authReq.auth.orgId ||
      (authReq.auth.claims as any)?.o?.id) as string;
    const boardId = req.params.boardId as string;
    const postId = req.params.postId as string;

    const deletedPost = await prisma.post.delete({
      where: { id: postId, boardId, tenantId },
    });

    // auditing logs
        await auditLogsQueue.add(
            'logs',
            {
                tenantId,
                userId: authReq.auth.userId,
                action: 'POST_DELETED',
                entityId: deletedPost.id,
                details: JSON.stringify({ title: deletedPost.title })
            }
        )

    return ApiResponseHandler.sendSuccess(res, { message: "Post deleted" });
  } catch (error) {
    console.error("Delete Post Error:", error);
    return ApiResponseHandler.sendError(res, "Failed to delete post", 500);
  }
};

// PATCH /api/boards/:boardId/posts/:postId
export const updatePostStatus = async (req: Request, res: Response) => {
  try {
    const authReq = req as unknown as AuthRequest;
    const tenantId = (authReq.auth.orgId ||
      (authReq.auth.claims as any)?.o?.id) as string;
    const boardId = req.params.boardId as string;
    const postId = req.params.postId as string;
    const { status } = req.body;

    if (!status) {
      return ApiResponseHandler.sendError(res, "Status is required", 400);
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId, boardId, tenantId },
      data: { status },
    });

    await auditLogsQueue.add("logs", {
      tenantId,
      userId: authReq.auth.userId,
      action: "POST_STATUS_UPDATED",
      entityId: updatedPost.id,
      details: JSON.stringify({ newStatus: status }),
    });

    return ApiResponseHandler.sendSuccess(res, updatedPost);
  } catch (error) {
    console.error("Update Post Error:", error);
    return ApiResponseHandler.sendError(res, "Failed to update post", 500);
  }
};

export const toggleUpvote = async (req: Request, res: Response) => {
  try {
    const authReq = req as unknown as AuthRequest;
    const tenantId = (authReq.auth.orgId ||
      (authReq.auth.claims as any)?.o?.id) as string;
    const userId = authReq.auth.userId;
    const postId = req.params.postId as string;

    const existingVote = await prisma.upvote.findUnique({
      where: { postId_authorId: { postId, authorId: userId } },
    });

    if (existingVote) {
      await prisma.upvote.delete({ where: { id: existingVote.id } });
      await auditLogsQueue.add("logs", {
        tenantId, userId: authReq.auth.userId, action: "POST_UPVOTE_REMOVED", entityId: postId
      });
      return ApiResponseHandler.sendSuccess(res, { voted: false });
    } else {
      await prisma.upvote.create({
        data: { tenantId, postId, authorId: userId },
      });
      await auditLogsQueue.add("logs", {
        tenantId, userId: authReq.auth.userId, action: "POST_UPVOTED", entityId: postId
      });
      return ApiResponseHandler.sendSuccess(res, { voted: true });
    }
  } catch (error) {
    console.error("Internal Upvote Error:", error);
    return ApiResponseHandler.sendError(res, "Failed to toggle upvote", 500);
  }
};
