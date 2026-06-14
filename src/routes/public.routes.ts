import { Router } from "express";
import { requireApiKey } from "../middleware/api.middleware";
import { getPublicBoard, createPublicPost, publicUpvotePost, createPublicComment, getPublicComments } from "../controllers/public.controller";

const router = Router();

// EVERY route in this file requires a valid API Key!
router.use(requireApiKey as any);

router.get('/boards/:slug', getPublicBoard as any);
router.post('/boards/:boardId/posts', createPublicPost as any);
router.post('/posts/:postId/upvote', publicUpvotePost as any);
router.post('/posts/:postId/comments', createPublicComment as any);
router.get('/posts/:postId/comments', getPublicComments as any);

export default router;