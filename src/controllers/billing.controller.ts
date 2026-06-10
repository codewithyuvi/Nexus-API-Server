import { prisma } from "../utils/prisma";
import { ApiResponseHandler } from "../utils/apiResponse";
import type { Request, Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware";
import { razorpay } from "../utils/razorpay";
import crypto from "crypto";
import { redisClient } from "../utils/redis";

// POST /api/billing/subscribe
export const createSubscription = async (req: Request, res: Response) => {
    try {
        const authReq = req as unknown as AuthRequest;
        const tenantId = authReq.auth.orgId || (authReq.auth.claims as any)?.o?.id;

        if (!tenantId) {
            return ApiResponseHandler.sendError(res, "Organization required", 401);
        }

        // Create a standard ₹1 order (100 paise) for 10,000 credits
        const order = await razorpay.orders.create({
            amount: 100,
            currency: "INR",
            receipt: `rcpt_${Date.now()}`
        });

        return ApiResponseHandler.sendSuccess(res, { subscriptionId: order.id });
    } catch (error) {
        console.error("Subscription Error:", error);
        return ApiResponseHandler.sendError(res, "Failed to create subscription", 500);
    }
};


// POST /api/billing/verify
export const verifySubscription = async (req: Request, res: Response) => {
    try {
        const authReq = req as unknown as AuthRequest;
        const tenantId = authReq.auth.orgId || (authReq.auth.claims as any)?.o?.id;
        
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

        // 1. Verify the cryptographic signature for ORDERS so hackers can't fake payments
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET as string)
            .update(razorpay_order_id  + "|" + razorpay_payment_id)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return ApiResponseHandler.sendError(res, "Invalid payment signature", 400);
        }

        const CREDITS_TO_ADD = 10000;

        // 2. Real payment! Update postgres to add credits
        await prisma.tenant.update({
            where: { id: tenantId as string },
            data: { apiCredits: {increment: CREDITS_TO_ADD} }
        });

        const creditKey = `credits:${tenantId}`;
        await redisClient.incrby(creditKey, CREDITS_TO_ADD);

        return ApiResponseHandler.sendSuccess(res, { message: "Wallet Topped Up successfully!" });
    } catch (error) {
        console.error("Verification Error:", error);
        return ApiResponseHandler.sendError(res, "Failed to verify subscription", 500);
    }
};