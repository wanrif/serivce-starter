import { Redis } from 'ioredis';

export const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
});

export const setCache = async (key: string, value: string, expire?: number): Promise<string> => {
  try {
    if (expire) {
      return await redisClient.set(key, value, 'EX', expire);
    } else {
      return await redisClient.set(key, value);
    }
  } catch (error: any) {
    console.error(`Error: ${error}`);
    return error;
  }
};

export const getCache = async (key: string): Promise<string | null> => {
  try {
    return await redisClient.get(key);
  } catch (error: any) {
    console.error(`Error: ${error}`);
    return null;
  }
};

export const deleteCache = async (key: string): Promise<number> => {
  try {
    return await redisClient.del(key);
  } catch (error: any) {
    console.error(`Error: ${error}`);
    return 0;
  }
};

export async function storeChatMessage(chatId: string, message: any): Promise<void> {
  const chatData = await redisClient.get(chatId);
  if (chatData) {
    const parsedData = JSON.parse(chatData);
    parsedData.messages.push(message);
    await redisClient.set(chatId, JSON.stringify(parsedData));
  }
}

export async function getChatHistory(chatId: string): Promise<any[]> {
  const chatData = await redisClient.get(chatId);
  if (chatData) {
    const parsedData = JSON.parse(chatData);
    return parsedData.messages || [];
  }
  return [];
}
