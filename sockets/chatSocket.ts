import { Server } from 'socket.io';
import jsonwebtoken from 'jsonwebtoken';
import { getChatHistory, redisClient, storeChatMessage } from 'utils/redisHelper';
import { encryptRoom } from 'utils/encryptHelper';

function getChatId(email1: string, email2: string): string {
  const encryptedEmails = encryptRoom(email1, email2);
  return `roomChat_${encryptedEmails}`;
}

const chatSocket = (io: Server) => {
  const chatNamespace = io.of('/chat');

  chatNamespace.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      console.log('Authentication error: Token missing');
      return next(new Error('Authentication error'));
    }

    jsonwebtoken.verify(token, process.env.JWT_SECRET as string, (err: any, decode: any) => {
      if (err) {
        console.log('Authentication error: Invalid token');
        return next(new Error('Authentication error'));
      }

      socket.data.user = decode;
      next();
    });
  });

  chatNamespace.on('connection', async (socket) => {
    console.log(`User ${socket.data.user.name} connected`);

    socket.on('openChat', async (userEmail: string) => {
      console.log(`User ${socket.data.user.name} opened chat with ${userEmail}`);
      const chatId = getChatId(socket.data.user.email, userEmail);
      socket.join(chatId); // Join the room

      const getRoomRedis = await redisClient.get(chatId);
      if (!getRoomRedis) {
        // 86400 = 24 hours
        await redisClient.set(
          chatId,
          JSON.stringify({ users: [socket.data.user.email, userEmail], messages: [] }),
          'EX',
          86400
        );
      }

      // Fetch and send chat history
      const chatHistory = await getChatHistory(chatId);
      socket.emit('chatHistory', chatHistory);
    });

    socket.on('sendMessage', async (data: { userEmail: string; message: string }) => {
      const chatId = getChatId(socket.data.user.email, data.userEmail);
      const newMessage = {
        sender: socket.data.user.email,
        content: data.message,
        timestamp: Date.now(),
      };

      await storeChatMessage(chatId, newMessage);

      // Broadcast the message to all users in the room
      chatNamespace.to(chatId).emit('newMessage', newMessage);
    });

    socket.on('disconnect', () => {
      console.log(`User ${socket.data.user.name} disconnected`);
    });
  });
};

export default chatSocket;
