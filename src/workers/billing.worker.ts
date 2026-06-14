import { Worker } from "bullmq";
import { redisConnection } from "../constants/redisConnection";
import { redisClient } from "../utils/redis";
import {prisma} from '../utils/prisma';

const billingJob = async (job:any) => {
    console.log(`[BullMQ] Billing Worker Woke Up at ${new Date().toISOString()}`);

    const allTenants = await prisma.tenant.findMany();
    console.log(`[BullMQ] Syncing ${allTenants.length} tenants with PostgreSQL.`);

    for(const tenant of allTenants){
        // Future billing logic for subscriptions will go here
    }
}

const billingWorker = new Worker('BillingQueue', billingJob, {connection: redisConnection});