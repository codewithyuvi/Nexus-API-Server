import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requireFgaRole } from "../middleware/fga.middleware";
import { getPosts, createPost, deletePost, updatePostStatus } from "../controllers/post.controller";

// mergeParams: true is critical so we can read the :boardId from the parent route!
const router = Router({ mergeParams: true });

router.use(requireAuth); 

router.get('/', requireFgaRole('member') as any, getPosts as any);

router.post('/', requireFgaRole('member') as any, createPost as any);
router.delete('/:postId', requireFgaRole('admin') as any, deletePost as any);
router.patch('/:postId', requireFgaRole('admin') as any, updatePostStatus as any);
export default router;