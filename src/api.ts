import "dotenv/config";
import express from "express";
import cors from "cors";

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

const app = express();
const PORT = process.env.PORT || 5000;

const httpServer = createServer(app);
export const io = initSocket(httpServer);

app.use("/api/webhooks", webHookRoutes);

app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
);

// Register Routes
app.use("/api/health", healthRoutes);
app.use("/api/user", userRoutes);
app.use("/api/boards", boardRoutes);
app.use("/api/keys", apiKeyRoutes);
app.use("/api/v1/public", publicRoutes);
app.use("/api/billing", billingRoutes);

// Global Error Handler
app.use(ErrorHandler);

httpServer.listen(PORT, () => {
  console.log(`🚀 Production API Server running on port ${PORT}`);
});
