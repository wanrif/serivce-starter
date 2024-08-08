import { type Boom, notFound } from '@hapi/boom';
import chalk from 'chalk';
import cors from 'cors';
import { connectDB } from 'config';
import type { NextFunction, Request, Response } from 'express';
import express from 'express';
import api from './routes';
import { createServer } from 'http';
import { Server } from 'socket.io';
import customParser from 'socket.io-msgpack-parser';
import { redisClient } from 'utils/redisHelper';
import { createAdapter } from '@socket.io/redis-adapter';
import chatSocket from 'sockets/chatSocket';
// import 'services/reloaded';

const app = express();
const port = 8080;
const httpServer = createServer(app);
const pubClient = redisClient;
const subClient = redisClient.duplicate();
const io = new Server(httpServer, {
  adapter: createAdapter(pubClient, subClient),
  path: '/chat/ws',
  addTrailingSlash: false,
  transports: ['polling', 'websocket'],
  allowUpgrades: true,
  connectTimeout: 10000,
  parser: customParser,
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

/* Connect to MongoDB */
connectDB();

/* Connect to Redis */
// connectRedis();

/* Middleware */
app.disable('x-powered-by');
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'PING!' });
});

/* Routes setup */
app.use('/api/starter', api);

/* Socket setup */
chatSocket(io);

/* 404 middleware */
app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(notFound('Route not found'));
});

/* Error handling middleware */
app.use((err: Boom, _req: Request, res: Response, _next: NextFunction) => {
  res.status(err.output.statusCode).json(err.output.payload);
});

httpServer.listen(port, () => {
  console.log(chalk.black.bgGreen.bold(`Server running on port ${port}`));
});
