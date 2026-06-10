import { fgaClient } from "../utils/openfga.js";
import { Webhook } from "svix";
import type { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { ApiResponseHandler } from "../utils/apiResponse";
import { createRazorpayCustomer } from "../utils/razorpay.js";

export const clerkWebhook = async (req: Request, res: Response) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    console.error(
      "webhook secret not found, Verification impossible without it",
    );
    throw new Error(
      "webhook secret not found, Verification impossible without it",
    );
  }

  const svix_id = req.headers["svix-id"] as string;
  const svix_timestamp = req.headers["svix-timestamp"] as string;
  const svix_signature = req.headers["svix-signature"] as string;

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return ApiResponseHandler.sendError(res, "svid headers missing", 400);
  }

  const payload = Buffer.isBuffer(req.body)
    ? req.body.toString("utf8")
    : req.body;

  let event: any;
  try {
    const webhook = new Webhook(WEBHOOK_SECRET);

    event = webhook.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (error: any) {
    console.log("Failed to Verify Signature");
    return ApiResponseHandler.sendError(res, "Failed to Verify Signature", 400);
  }

  const eventType = event.type;

  if (eventType === "organization.created") {
    const { id, name, created_by } = event.data;

    try {
      const rzpCustomerId = await createRazorpayCustomer(name, id);
      const createdTenant = await prisma.$transaction(async (tx) => {
        const newTenant = await tx.tenant.create({
          data: {
            id: id, // We use the exact Clerk Org ID as our Postgres ID!
            name: name,
            slug: `${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now().toString().slice(-4)}`,
            razorpayCustomerId: rzpCustomerId 
          },
        });

        await tx.tenantMember.create({
          data: {
            tenantId: newTenant.id,
            clerkUserId: created_by,
            baseRole: "ADMIN",
          },
        });
        return newTenant;
      });

      await fgaClient.write({
        writes: [
          {
            user: `user:${created_by}`,
            relation: "admin",
            object: `tenant:${createdTenant.id}`,
          },
        ],
      });

      console.log(`Provisioned new B2B Organization: ${name}`);
    } catch (dbError: any) {
      console.error("Provisioning Error:", dbError);
      return ApiResponseHandler.sendError(res, "Provisioning Error", 500);
    }
  }

  if (eventType === "organizationMembership.created") {
    const { organization, public_user_data, role } = event.data;
    const orgId = organization.id;
    const userId = public_user_data.user_id;

    const baseRole = role === "org:admin" ? "ADMIN" : "MEMBER";
    try {
      await prisma.tenantMember.create({
        data: {
          tenantId: orgId,
          clerkUserId: userId,
          baseRole: baseRole,
        },
      });
      await fgaClient.write({
        writes: [
          {
            user: `user:${userId}`,
            relation: baseRole.toLowerCase(),
            object: `tenant:${orgId}`,
          },
        ],
      });
      console.log(
        `Added user ${userId} to organization ${orgId} as ${baseRole}`,
      );
    } catch (dbError: any) {
      // Safely ignore duplicate inserts
      if (dbError.code === "P2002") {
        console.log(
          `Ignored duplicate: User ${userId} is already in ${orgId}.`,
        );
        return res.status(200).json({ success: true });
      }

      if (dbError.code === "P2003") {
        console.log(
          `Waiting for Tenant ${orgId} to be created. Clerk will retry...`,
        );
        return res.status(500).json({ success: false });
      }
      console.error("Membership Error:", dbError);
      return ApiResponseHandler.sendError(res, "Membership Error", 500);
    }
  }
  if (eventType === "organization.deleted") {
    const { id } = event.data;
    try {
      await prisma.tenant.delete({
        where: { id: id },
      });
      console.log(`Deleted B2B Organization from database: ${id}`);
    } catch (dbError: any) {
      console.error("Organization Deletion Error:", dbError);
      // We don't return 500 here because the tenant might have already been deleted.
    }
  }

  // 3. General User Signup (No longer creates a workspace)
  if (eventType === "user.created") {
    console.log(
      `New global user signed up: ${event.data.id}. Waiting for them to create or join an Organization.`,
    );
  }
  return res.status(200).json({ success: true });
};
