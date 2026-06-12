import "dotenv/config";
import express from "express";
import cors from "cors";
import cron from "node-cron";

import { createServer } from "http";
import { initSocket } from "./utils/socket";

import { ErrorHandler } from "./middleware/error.middleware";
import healthRoutes from "./routes/health.routes";
import userRoutes from "./routes/user.routes";
import webHookRoutes from "./routes/webhook.routes";
import boardRoutes from "./routes/board.routes";
import apiKeyRoutes from "./routes/apikey.routes";
import publicRoutes from "./routes/public.routes";
import billingRoutes from "./routes/billing.routes";
import "./workers/audit.worker";
import "./workers/billing.worker";
import "./queues/billing.queue";
import "./workers/outboundWebhook.worker";

const app = express();
const PORT = process.env.PORT || 5000;

const httpServer = createServer(app);
// Initialize WebSockets safely!
export const io = initSocket(httpServer);

app.use("/api/webhooks", webHookRoutes);

app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173", 
      "https://nexus-customer.vercel.app",
      "https://nexus-api-client.vercel.app",
      process.env.CLIENT_URL || "http://localhost:3000"
    ],
    credentials: true,
  }),
);

// Register Routes
app.use("/api/health", healthRoutes);
app.use("/api/user", userRoutes);

// Board Routes
app.use("/api/boards", boardRoutes);

// Api Keys
app.use("/api/keys", apiKeyRoutes);

app.use("/api/v1/public", publicRoutes);
app.use("/api/billing", billingRoutes);

// Global Error Handler
app.use(ErrorHandler);

// --- RENDER FREE TIER KEEP-AWAKE (USING CRON) ---
// Pings the server every 13 minutes, but ONLY between 4 AM UTC and 3:59 PM UTC
// (This is exactly 9:30 AM IST to 9:30 PM IST).
// The cron expression "*/13 4-15 * * *" guarantees it stays within our 12-hour budget!
cron.schedule('*/13 4-15 * * *', () => {
  fetch('https://nexus-api-worker.onrender.com/api/health')
    .then(() => console.log(`[${new Date().toISOString()}] Cron ping successful to keep Render awake`))
    .catch((err) => console.error('Cron ping failed:', err.message));
});

httpServer.listen(PORT, () => {
  console.log(`Production-ready Server running on port ${PORT}`);
});
