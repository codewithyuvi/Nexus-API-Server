import { Worker } from "bullmq";
import {prisma} from '../utils/prisma';
import { redisConnection } from "../constants/redisConnection";
import { clerkClient } from '@clerk/clerk-sdk-node';

const auditJob = async (job:any) => {
    const {tenantId, userId, action, entityId, details} = job.data;
    
    // 1. Heavy Task: Ask Postgres for the Organization Name
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const orgName = tenant?.name || tenantId;

    // 2. Heavy Task: Ask Clerk API for the User's Name
    let userName = userId; // fallback just in case
    try {
        const user = await clerkClient.users.getUser(userId);
        userName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : userId;
    } catch (error) {
        console.log("Could not fetch user name from Clerk");
    }

    // 3. Create the beautiful human-readable string you asked for!
    const formattedDetails = `User ${userName} of ${orgName} performed ${action}. Extra Info: ${details}`;

    // 4. Finally, save it to the database
    await prisma.auditLog.create({
        data: {
            tenantId,
            userId,
            action,
            entityId,
            details: formattedDetails // Save our custom string!
        }
    });
}

const auditLogWorker = new Worker('AuditLogsQueue', auditJob, {connection: redisConnection});