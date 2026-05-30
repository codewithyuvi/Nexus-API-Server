import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requireFgaRole } from "../middleware/fga.middleware";
import { createComment, deleteComment } from "../controllers/comment.controller";

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.post('/', requireFgaRole('member') as any, createComment as any);
router.delete('/:commentId', requireFgaRole('admin') as any, deleteComment as any);

export default router;
