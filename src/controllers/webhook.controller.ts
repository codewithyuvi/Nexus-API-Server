import { fgaClient } from '../utils/openfga.js';
import { Webhook } from "svix";
import type { Request, Response } from "express";
import {prisma} from "../utils/prisma"
import { ApiResponseHandler } from "../utils/apiResponse";

export const clerkWebhook = async (req: Request, res: Response) => {
    
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
    if(!WEBHOOK_SECRET){
        console.error("webhook secret not found, Verification impossible without it");
        throw new Error("webhook secret not found, Verification impossible without it");
    }

    const svix_id = req.headers['svix-id'] as string;
    const svix_timestamp = req.headers['svix-timestamp'] as string;
    const svix_signature = req.headers['svix-signature'] as string;

    if( !svix_id || !svix_timestamp || !svix_signature ){
        return ApiResponseHandler.sendError(res, 'svid headers missing', 400);
    }

    
    const payload = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.body;

    let event: any;
    try {
        const webhook = new Webhook(WEBHOOK_SECRET);

        event = webhook.verify(
            payload, 
            {
                'svix-id': svix_id, 
                'svix-timestamp': svix_timestamp, 
                'svix-signature': svix_signature
            }
        );

    } catch (error : any)  {
        console.log("Failed to Verify Signature");
        return ApiResponseHandler.sendError(res, 'Failed to Verify Signature', 400);
    }

    const eventType = event.type;
    if(eventType === 'user.created'){
        const { id, first_name, email_addresses } = event.data;

        const name = first_name || email_addresses[0].email_address.split('@')[0];

        try {
            //create personal tenant
             // We use a Prisma Transaction so if one fails, both fail.
            const createdTenant = await prisma.$transaction(async (tx) => {

                const newTenant = await tx.tenant.create({
                    data: {
                        name: `${name}'s Workspace`,
                        slug: `${name.toLowerCase()}-${Date.now().toString().slice(-4)}`
                    }
                })

                await tx.tenantMember.create({
                    data: {
                        tenantId: newTenant.id,
                        clerkUserId: id,
                        baseRole: "ADMIN"
                    }
                });
                return newTenant;
            }) ;

            await fgaClient.write({
                writes: [{
                    user: `user:${id}`, // e.g. "user:user_2abc123"
                    relation: 'admin',
                    object: `tenant:${createdTenant.id}` // e.g. "tenant:uuid-1234"
                }]
            });

           

            console.log(`Provisioned workspace for ${name}`);
        } catch (dbError: any) {
            console.error('Provisioning Error during webhook:', dbError);
            return ApiResponseHandler.sendError(res, 'Provisioning Error during webhook:', 500);
        }
    }
    return res.status(200).json({ success: true });
}