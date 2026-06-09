import { Queue } from "bullmq";
import { redisConnection } from "../constants/redisConnection";

export const outboundWebhookQueue = new Queue('OutboundWebhookQueue', {
    connection: redisConnection,
    defaultJobOptions: {
        // This is the magic of Webhooks! If Company X's server is down, 
        // BullMQ will automatically retry sending the payload using Exponential Backoff.
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 5000, // 5s, 25s, 125s, etc.
        }
    }
});

// 2. Create a helper function to add payloads to the queue
export const dispatchWebhook = async (tenantId: string, eventType: string, payload: any) => {
    await outboundWebhookQueue.add('send-webhook', {
        tenantId,
        eventType,
        payload
    });
};