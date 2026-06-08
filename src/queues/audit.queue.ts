import { Queue } from "bullmq";

import { redisConnection } from "../constants/redisConnection";

export const auditLogsQueue = new Queue('AuditLogsQueue', {connection: redisConnection});