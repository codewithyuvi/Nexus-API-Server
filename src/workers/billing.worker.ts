import { Worker } from "bullmq";
import { redisConnection } from "../constants/redisConnection";
import { redisClient } from "../utils/redis";
import {prisma} from '../utils/prisma';
import { reportUsageToRazorpay } from "../utils/razorpay";

const billingJob = async (job:any) => {

    const activeTenants = await prisma.tenant.findMany({
        where: {razorpaySubscriptionId: {not: null}}
    })

    for(const tenant of activeTenants){
        const redisKey = `usage:${tenant.id}`;
        const usageString = await redisClient.get(redisKey);
        const usageCount = Number(usageString || 0);
        console.log(usageCount);
        if(usageCount > 0 ){
            console.log(`Tenant ${tenant.id} used ${usageCount} requests. Billing them...`);
            await reportUsageToRazorpay(tenant.razorpaySubscriptionId as string, usageCount);
            await redisClient.del(redisKey);
        }
    }
 
}

const billingWorker = new Worker('BillingQueue', billingJob, {connection: redisConnection});