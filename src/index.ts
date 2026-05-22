import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { ErrorHandler } from './middleware/error.middleware.js';
import healthRoutes from './routes/health.routes.js';
import userRoutes from './routes/user.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000', 
  credentials: true, 
}));

// 2. Register Routes
app.use('/api/health', healthRoutes);
app.use('/api/user', userRoutes);

// 3. Global Error Handler (MUST be the very last middleware)
app.use(ErrorHandler);

app.listen(PORT, () => {
  console.log(`Production-ready Server running on port ${PORT}`);
});