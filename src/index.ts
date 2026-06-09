import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import './workers/audit.worker';
import { ErrorHandler } from './middleware/error.middleware';
import { trackApiUsage } from './middleware/apiUsage.middleware';
import healthRoutes from './routes/health.routes';
import userRoutes from './routes/user.routes';
import webHookRoutes from './routes/webhook.routes'
import boardRoutes from './routes/board.routes';
import apiKeyRoutes from './routes/apikey.routes';
import publicRoutes from './routes/public.routes';

const app = express();
const PORT = process.env.PORT || 5000;

app.use('/api/webhooks', webHookRoutes);

app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000', 
  credentials: true, 
}));

app.use(trackApiUsage);

// Register Routes
app.use('/api/health', healthRoutes);
app.use('/api/user', userRoutes);

// Board Routes
app.use('/api/boards', boardRoutes);

// Api Keys
app.use('/api/keys', apiKeyRoutes);

app.use('/api/v1/public', publicRoutes);



// Global Error Handler 
app.use(ErrorHandler);



app.listen(PORT, () => {
  console.log(`Production-ready Server running on port ${PORT}`);
});