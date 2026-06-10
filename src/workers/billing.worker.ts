import { Worker } from "bullmq";
import { redisConnection } from "../constants/redisConnection";
import { redisClient } from "../utils/redis";
import {prisma} from '../utils/prisma';
import { reportUsageToRazorpay } from "../utils/razorpay";

const billingJob = async (job:any) => {
    console.log(`[BullMQ] Billing Worker Woke Up at ${new Date().toISOString()}`);

    const activeTenants = await prisma.tenant.findMany({
        where: {razorpaySubscriptionId: {not: null}}
    })

    console.log(`[BullMQ] Found ${activeTenants.length} tenants with active subscriptions.`);

    for(const tenant of activeTenants){
        const redisKey = `usage:${tenant.id}`;
        const usageString = await redisClient.get(redisKey);
        const usageCount = Number(usageString || 0);
        console.log(usageCount);
        if(usageCount > 0 ){
            console.log(`Tenant ${tenant.id} used ${usageCount} requests. Billing them...`);
            try {
                await reportUsageToRazorpay(tenant.razorpaySubscriptionId as string, usageCount);
                await redisClient.del(redisKey);
            } catch (error) {
                console.error(`Failed to bill tenant ${tenant.id}. Error:`, error);
                // We do NOT delete the redis key, ensuring it stays in the queue to be retried next hour
            }
            console.log(`Billing Completed`);
        }
    }
}

const billingWorker = new Worker('BillingQueue', billingJob, {connection: redisConnection});