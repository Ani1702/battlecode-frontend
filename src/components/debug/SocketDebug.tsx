"use client";
import { useSocket } from "@/contexts/SocketContext";
import { useAuth } from "@/contexts/AuthContext";

export default function SocketDebug() {
  const { socket, isConnected, isLoading } = useSocket();
  const { user, userId } = useAuth();

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-sm max-w-sm">
      <h3 className="font-bold text-green-400 mb-2">🔌 Socket Debug</h3>
      <div className="space-y-1">
        <div>
          Status:{" "}
          <span className={isConnected ? "text-green-400" : "text-red-400"}>
            {isLoading
              ? "Connecting..."
              : isConnected
                ? "Connected"
                : "Disconnected"}
          </span>
        </div>
        <div>
          User:{" "}
          <span className="text-blue-400">{user?.id || "Not logged in"}</span>
        </div>
        <div>
          UserID: <span className="text-blue-400">{userId || "None"}</span>
        </div>
        <div>
          Socket ID:{" "}
          <span className="text-yellow-400">{socket?.id || "None"}</span>
        </div>
        <div>
          Socket URL:{" "}
          <span className="text-gray-400">
            {process.env.NEXT_PUBLIC_SOCKET_URL}
          </span>
        </div>
      </div>
    </div>
  );
}
