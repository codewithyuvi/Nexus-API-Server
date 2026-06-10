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
        const usageString = await redisClient.get(usageKey);
        const usageCount = Number(usageString || 0);
        console.log(usageCount);
        if(usageCount > 0 ){
            console.log(`Syncing ${usageCount} used credits for Tenant ${tenant.id} to Postgres...`);            
            
            try {
                // Deduct the usage from their master database balance
                await prisma.tenant.update({
                    where: { id: tenant.id},
                    data: { apiCredits: {decrement: usageCount}}
                });

                //clear the redis usage buffer now
                await redisClient.del(usageKey);

            } catch (error) {
                console.error(`Failed to sync tenant ${tenant.id}. Error:`, error);
                // We do NOT delete the redis key, ensuring it stays in the queue to be retried next hour
            }
        }
    }
}

const billingWorker = new Worker('BillingQueue', billingJob, {connection: redisConnection});