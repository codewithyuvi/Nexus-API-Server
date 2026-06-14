import { Worker } from "bullmq";
import { redisConnection } from "../constants/redisConnection";
import { redisClient } from "../utils/redis";
import {prisma} from '../utils/prisma';

const billingJob = async (job:any) => {
    console.log(`[BullMQ] Billing Worker Woke Up at ${new Date().toISOString()}`);

    const allTenants = await prisma.tenant.findMany();
    console.log(`[BullMQ] Syncing ${allTenants.length} tenants with PostgreSQL.`);

    for(const tenant of allTenants){
        const usageKey = `usage:${tenant.id}`;
        
        // Atomically get and reset the usage count from Redis
        const usageStr = await redisClient.getset(usageKey, "0");
        const usageCount = usageStr ? parseInt(usageStr, 10) : 0;

        if (usageCount > 0) {
            console.log(`[BullMQ] Syncing ${usageCount} API requests for ${tenant.id}`);
            
            try {
                // Deduct the usage from their permanent wallet balance in Postgres
                await prisma.tenant.update({
                    where: { id: tenant.id},
                    data: { apiCredits: {decrement: usageCount} }
                });
            } catch (err) {
                console.error(`[BullMQ] Failed to update credits for ${tenant.id}`, err);
                // If Postgres goes down, safely push the uncounted usage back into Redis!
                await redisClient.incrby(usageKey, usageCount);
            }
        }
    }
}

const billingWorker = new Worker('BillingQueue', billingJob, {connection: redisConnection});