import { Router } from "express";
import express  from "express";
import { clerkWebhook } from "../controllers/webhook.controller";

const router = Router();

router.post('/clerk', express.raw({ type: 'application/json' }), clerkWebhook);

export default router ;
