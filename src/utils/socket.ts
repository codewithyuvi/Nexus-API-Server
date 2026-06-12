import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";

let io: Server;

export const initSocket = (httpServer: any) => {
  if (!process.env.REDIS_URL) throw new Error("CRITICAL ERROR: REDIS_URL missing!");
  const pubClient = new Redis(process.env.REDIS_URL);
  const subClient = pubClient.duplicate();

  // Suppress verbose reconnect errors during boot
  pubClient.on('error', (err: any) => {
    if (err.code !== 'ECONNREFUSED') console.error('Redis PubClient Error:', err.message);
  });
  subClient.on('error', (err: any) => {
    if (err.code !== 'ECONNREFUSED') console.error('Redis SubClient Error:', err.message);
  });

  io = new Server(httpServer, {
    cors: {
      origin: [
        "http://localhost:3000", 
        "http://localhost:5173",
        "https://nexus-customer.vercel.app",
        "https://nexus-api-client.vercel.app",
        process.env.CLIENT_URL || "http://localhost:3000"
      ],
      credentials: true,
    },
  });

  io.adapter(createAdapter(pubClient, subClient));

  io.on('connection', (socket) => {
    console.log("Client Connected", socket.id);

    socket.on("join-board", (boardId) => {
      socket.join(boardId);
      console.log(`Socket ${socket.id} joined board ${boardId}`);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected: ", socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};
