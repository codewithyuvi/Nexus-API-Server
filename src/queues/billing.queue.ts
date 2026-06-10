import { Queue } from "bullmq";
import { redisConnection } from "../constants/redisConnection";

export const billingQueue = new Queue('BillingQueue', {connection: redisConnection});

billingQueue.add('hourly-sync', {}, {repeat: {pattern: '* * * * *'} })
