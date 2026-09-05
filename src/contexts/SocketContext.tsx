"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";

interface ISocketContext {
  socket: Socket | null;
  isConnected: boolean;
  isLoading: boolean;
}

const SocketContext = createContext<ISocketContext | null>(null);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { session } = useAuth();

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Prevent Next.js dev overlay from showing [object Object] modal for raw object rejections or cancelled navigations
      if (event.reason !== undefined) {
        console.warn("Caught unhandled promise rejection:", event.reason);
        if (typeof event.reason === "object" && !(event.reason instanceof Error)) {
          event.preventDefault();
        }
      }
    };
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    if (!session?.access_token) {
      setSocket(null);
      setIsConnected(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
      auth: {
        token: session.access_token,
      },
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    const onConnect = () => {
      setIsConnected(true);
      setIsLoading(false);
      console.log("Socket connected");
    };

    const onDisconnect = () => {
      setIsConnected(false);
      console.log("Socket disconnected");
    };

    const onConnectError = (error: Error) => {
      console.error("Socket connection error:", error);
      setIsConnected(false);
      setIsLoading(false);
    };

    socketInstance.on("connect", onConnect);
    socketInstance.on("disconnect", onDisconnect);
    socketInstance.on("connect_error", onConnectError);

    setSocket(socketInstance);

    return () => {
      socketInstance.off("connect", onConnect);
      socketInstance.off("disconnect", onDisconnect);
      socketInstance.off("connect_error", onConnectError);
      socketInstance.disconnect();
    };
  }, [session?.access_token]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, isLoading }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
