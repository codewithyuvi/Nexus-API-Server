import { prisma } from "../utils/prisma";
import { ApiResponseHandler } from "../utils/apiResponse";
import type { AuthRequest } from "../middleware/auth.middleware";
import type { Request, Response } from "express";
import { auditLogsQueue } from "../queues/audit.queue";
import { getIO } from "../utils/socket";

// POST /api/boards/:boardId/posts/:postId/comments
export const createComment = async (req: Request, res: Response) => {
  try {
    const authReq = req as unknown as AuthRequest;
    const tenantId = (authReq.auth.orgId ||
      (authReq.auth.claims as any)?.o?.id) as string;
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
        isInternal: isInternal || false,
      },
    });

    if (post) {
      getIO().to(post.boardId).emit("comment-created", { postId, comment: newComment });
    }

    // auditing logs
    await auditLogsQueue.add("logs", {
      tenantId,
      userId: authReq.auth.userId,
      action: "COMMENT_CREATED",
      entityId: newComment.id,
      details: JSON.stringify({ content: newComment.content }),
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
    const tenantId = (authReq.auth.orgId ||
      (authReq.auth.claims as any)?.o?.id) as string;
    const commentId = req.params.commentId as string;

    const deletedComment = await prisma.comment.delete({
      where: { id: commentId, tenantId },
    });

    const post = await prisma.post.findUnique({ where: { id: deletedComment.postId }, select: { boardId: true } });
    if (post) {
      getIO().to(post.boardId).emit("comment-deleted", { postId: deletedComment.postId, commentId });
    }

    // auditing logs
    await auditLogsQueue.add("logs", {
      tenantId,
      userId: authReq.auth.userId,
      action: "COMMENT_DELETED",
      entityId: deletedComment.id,
      details: JSON.stringify({ content: deletedComment.content }),
    });

    return ApiResponseHandler.sendSuccess(res, { message: "Comment deleted" });
  } catch (error) {
    console.error("Delete Comment Error:", error);
    return ApiResponseHandler.sendError(res, "Failed to delete comment", 500);
  }
};
