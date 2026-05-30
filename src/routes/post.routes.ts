import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requireFgaRole } from "../middleware/fga.middleware";
import { getPosts, createPost, deletePost, updatePostStatus, toggleUpvote } from "../controllers/post.controller";
import commentRoutes from "./comment.routes";

// mergeParams: true is critical so we can read the :boardId from the parent route!
const router = Router({ mergeParams: true });

router.use(requireAuth); 

router.get('/', requireFgaRole('member') as any, getPosts as any);

router.post('/', requireFgaRole('member') as any, createPost as any);
router.delete('/:postId', requireFgaRole('admin') as any, deletePost as any);
router.patch('/:postId', requireFgaRole('admin') as any, updatePostStatus as any);
router.post('/:postId/upvote', requireFgaRole('member') as any, toggleUpvote as any);

router.use('/:postId/comments', commentRoutes);

export default router;