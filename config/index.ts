import chalk from 'chalk';
import mongoose from 'mongoose';
import { Redis } from 'ioredis';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(chalk.black.bgGreen.bold(`MongoDB connected: ${conn.connection.host}`));
  } catch (error: any) {
    console.error(`Mongo Error: ${error}`);
    process.exit(1);
  }
};

export const connectRedis = async (): Promise<Redis> => {
  const client = new Redis({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  });
  // Flush Redis DB
  // client.flushdb();
  client.on('connect', () => {
    console.log(chalk.black.bgGreen.bold('Redis connected'));
  });
  client.on('error', (error) => {
    console.error(`Redis Error: ${error}`);
    process.exit(1);
  });
  return client;
};
