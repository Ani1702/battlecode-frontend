import { io, Socket } from "socket.io-client";

let socket: Socket;

export const initializeSocket = (token: string) => {
  socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
    auth: {
      token: token,
    },
    autoConnect: false,
  });
  return socket;
};

export const getSocket = () => {
  if (!socket) {
    throw new Error("Socket not initialized. Call initializeSocket first.");
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
  }
};
