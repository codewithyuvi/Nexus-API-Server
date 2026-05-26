import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requireFgaRole } from "../middleware/fga.middleware";
import { getBoards, createBoard } from "../controllers/board.controller";

const router = Router();

// 1. Must have a valid Clerk token
router.use(requireAuth); 

// 2. Fetching boards -> Requires "member" access (Admins automatically get this per our FGA model!)
router.get('/', requireFgaRole('MEMBER'), getBoards);

// 3. Creating boards -> Requires strict "admin" access
router.post('/', requireFgaRole('ADMIN'), createBoard);

export default router;