import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requireFgaRole } from "../middleware/fga.middleware";
import { getBoards, createBoard, deleteBoard } from "../controllers/board.controller";
import postRoutes from "./post.routes";

const router = Router();

// Must have a valid Clerk token
router.use(requireAuth); 

router.use('/:boardId/posts', postRoutes);

router.get('/', requireFgaRole('member'), getBoards);

router.post('/', requireFgaRole('admin'), createBoard);
// 4. Deleting boards -> Requires strict "ADMIN" access
router.delete('/:boardId', requireFgaRole('admin') as any, deleteBoard as any);
export default router;