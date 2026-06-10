import "dotenv/config";
import express from "express";
import cors from "cors";

import { createServer } from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";

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

const httpServer = createServer(app); // Standard Express (app.listen()) only understands "Request -> Response" (the connection closes immediately). WebSockets require a persistent, two-way open connection. I have to wrap my Express app inside Node's native HTTP module to support this.

const pubClient = new Redis(process.env.REDIS_URL as string);
const subClient = pubClient.duplicate();

export const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  },
});

io.adapter(createAdapter(pubClient, subClient));

// Handle incoming connections
io.on('connection', (socket) => {
  console.log("Client Connected", socket.id);

  // When a user opens a board on the frontend, they join a specific "Room"
  socket.on("join-board", (boardId) => {
    socket.join(boardId);
    console.log(`Socket ${socket.id} joined board ${boardId}`);
  })

  socket.on("disconnect", () => {
    console.log("Client disconnected: ", socket.id);
  })
})

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

// Board Routes
app.use("/api/boards", boardRoutes);

// Api Keys
app.use("/api/keys", apiKeyRoutes);

app.use("/api/v1/public", publicRoutes);
app.use("/api/billing", billingRoutes);

// Global Error Handler
app.use(ErrorHandler);

httpServer.listen(PORT, () => {
  console.log(`Production-ready Server running on port ${PORT}`);
});
