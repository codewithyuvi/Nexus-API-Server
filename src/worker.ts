import "dotenv/config";

// Import all Background Workers
import "./workers/audit.worker";
import "./workers/billing.worker";
import "./workers/outboundWebhook.worker";

// Initialize Queues that run cron schedules
import "./queues/billing.queue";

console.log(`👷 Production Background Worker Started successfully.`);
