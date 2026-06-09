import { Worker } from "bullmq";
import { redisConnection } from "../constants/redisConnection";
import { prisma } from "../utils/prisma";
import crypto from "crypto";

const processWebhook = async (job: any) => {
    const { tenantId, eventType, payload } = job.data;

    // Get the customer's Webhook URL and Secret from the database
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { webhookUrl: true, webhookSecret: true }
    });

    // If the customer hasn't set up webhooks, just ignore it and return
    if (!tenant?.webhookUrl || !tenant?.webhookSecret) {
        return;
    }

    const payloadString = JSON.stringify(payload);

    // Cryptographically sign the payload so Company X knows it's really from us (signs them using bank-grade cryptography (HMAC SHA-256) (Hash-based Message Authentication Code(HMAC)))
    const signature = crypto
        .createHmac("sha256", tenant.webhookSecret) // This initializes a Hash-based Message Authentication Code (HMAC) using the SHA-256 cryptographic algorithm. It mixes the data with a secret key (tenant.webhookSecret) known only to you and the receiver.
        .update(payloadString) // This feeds the actual data you are sending (the payloadString, usually a JSON string of the event details) into the HMAC engine.
        .digest("hex"); //This finalizes the cryptographic operation and outputs the resulting signature as a readable, lowercase hexadecimal string (e.g., a1b2c3d4...).

    // Fire the POST request to Company X's server!
    try {
        const response = await fetch(tenant.webhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-nexus-event": eventType,
                "x-nexus-signature": signature // The hacker-proof signature
            },
            body: payloadString
        });

        if (!response.ok) {
            // If Company X's server is down, throwing an error tells BullMQ to 
            // put the job back in the queue and try again in a few minutes!
            throw new Error(`Customer server responded with status: ${response.status}`);
        }

        console.log(`Successfully delivered ${eventType} webhook to Tenant ${tenantId}`);

    } catch (error: any) {
        console.error(`Webhook delivery failed: ${error.message}`);
        throw error; // Crucial: Throwing triggers the Exponential Backoff retry!
    }
};

const webhookWorker = new Worker('OutboundWebhookQueue', processWebhook, {
    connection: redisConnection
});