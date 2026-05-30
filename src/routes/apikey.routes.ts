import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requireFgaRole } from "../middleware/fga.middleware";
import { getKeys, generateKey, revokeKey } from "../controllers/api.controller";

const router = Router();

// 1. Check Clerk JWT
router.use(requireAuth); 

// 2. Lock everything behind Admin role!
router.get('/', requireFgaRole('admin') as any, getKeys as any);
router.post('/', requireFgaRole('admin') as any, generateKey as any);
router.delete('/:keyId', requireFgaRole('admin') as any, revokeKey as any);

export default router;