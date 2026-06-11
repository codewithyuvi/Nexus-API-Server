import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";

let io: Server;

export const initSocket = (httpServer: any) => {
  const pubClient = new Redis(process.env.REDIS_URL as string);
  const subClient = pubClient.duplicate();

  io = new Server(httpServer, {
    cors: {
      origin: [
        "http://localhost:3000", 
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
