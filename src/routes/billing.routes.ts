import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requireFgaRole } from "../middleware/fga.middleware";
import { createSubscription, verifySubscription } from "../controllers/billing.controller";

const router = Router();

// Only logged in Admins can touch billing
router.use(requireAuth); 

router.post('/subscribe', requireFgaRole('admin') as any, createSubscription as any);
router.post('/verify', requireFgaRole('admin') as any, verifySubscription as any);

export default router;
