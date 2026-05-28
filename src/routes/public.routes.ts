import { Router } from "express";
import { requireApiKey } from "../middleware/api.middleware";
import { getPublicBoard, createPublicPost } from "../controllers/public.controller";

const router = Router();

// EVERY route in this file requires a valid API Key!
router.use(requireApiKey as any);

router.get('/boards/:slug', getPublicBoard as any);
router.post('/boards/:boardId/posts', createPublicPost as any);

export default router;