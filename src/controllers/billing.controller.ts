import { prisma } from "../utils/prisma";
import { ApiResponseHandler } from "../utils/apiResponse";
import type { Request, Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware";
import { razorpay } from "../utils/razorpay";
import crypto from "crypto";

// POST /api/billing/subscribe
export const createSubscription = async (req: Request, res: Response) => {
    try {
        const authReq = req as unknown as AuthRequest;
        const tenantId = authReq.auth.orgId || (authReq.auth.claims as any)?.o?.id;

        if (!tenantId) {
            return ApiResponseHandler.sendError(res, "Organization required", 401);
        }

        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

        if (!tenant?.razorpayCustomerId) {
            return ApiResponseHandler.sendError(res, "Customer not found in Razorpay", 400);
        }

        // Cast to any to bypass incomplete TS types in the Razorpay SDK
        const subscription = await (razorpay.subscriptions.create as any)({
            plan_id: process.env.RAZORPAY_PLAN_ID as string,
            customer_id: tenant.razorpayCustomerId,
            total_count: 120, // 10 years (standard recurring model)
        });

        // 2. Return the Razorpay Subscription ID to the frontend to launch the popup
        return ApiResponseHandler.sendSuccess(res, { subscriptionId: subscription.id });
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
        
        const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = req.body;

        // 1. Verify the cryptographic signature so hackers can't fake payments
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET as string)
            .update(razorpay_payment_id + "|" + razorpay_subscription_id)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return ApiResponseHandler.sendError(res, "Invalid payment signature", 400);
        }

        // 2. Real payment! Save the active subscription ID to our database
        await prisma.tenant.update({
            where: { id: tenantId as string },
            data: { razorpaySubscriptionId: razorpay_subscription_id }
        });

        return ApiResponseHandler.sendSuccess(res, { message: "Subscription activated!" });
    } catch (error) {
        console.error("Verification Error:", error);
        return ApiResponseHandler.sendError(res, "Failed to verify subscription", 500);
    }
};