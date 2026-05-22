import { Router } from "express";
import { getUser } from "../controllers/user.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.get('/', requireAuth, getUser);

export default router;