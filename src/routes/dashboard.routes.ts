import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { getDashboardStats } from "../controllers/dashboard.controller";

const router = Router();

// Protect the entire router
router.use(requireAuth);

router.get("/stats", getDashboardStats as any);

export default router;
