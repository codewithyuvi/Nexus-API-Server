import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requireFgaRole } from "../middleware/fga.middleware";
import { getBoards, createBoard } from "../controllers/board.controller";

const router = Router();

// Must have a valid Clerk token
router.use(requireAuth); 

router.get('/', requireFgaRole('member'), getBoards);

router.post('/', requireFgaRole('admin'), createBoard);

export default router;