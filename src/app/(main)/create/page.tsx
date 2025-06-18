"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/contexts/SocketContext";
import { useAuth } from "@/contexts/AuthContext"; // Add this import

export default function CreateRoom() {
  const [settings, setSettings] = useState({
    timeLimit: 30,
    questionCount: 3,
    difficulty: "medium",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { socket, isConnected, isLoading } = useSocket();
  const { user } = useAuth(); // Get the user from AuthContext

  const handleCreate = () => {
    if (!user) {
      setError("You must be logged in to create a room");
      return;
    }

    if (isLoading || !socket || !isConnected) {
      setError("Connection not ready");
      return;
    }

    setIsCreating(true);
    setError("");

    // Add timeout fallback
    const timeout = setTimeout(() => {
      setIsCreating(false);
      setError("Server response timed out");
    }, 10000); // 10 seconds timeout

    socket.emit(
      "createRoom",
      settings,
      (response: { roomId: string } | { error: string }) => {
        clearTimeout(timeout); // Clear the timeout if we get a response
        setIsCreating(false);

        if (!response) {
          setError("No response from server");
          return;
        }

        if ("error" in response) {
          setError(response.error);
          console.error("Room creation error:", response.error);
        } else if ("roomId" in response) {
          console.log("Room created:", response.roomId);
          router.push(`/play/${response.roomId}`);
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Connecting to server...</p>
      </div>
    );
  }

  if (!socket || !isConnected) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">
          Connection failed. Please refresh the page.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6">Create Battle</h1>

      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-gray-700 mb-2">
            Time Limit (minutes)
          </label>
          <input
            type="number"
            value={settings.timeLimit}
            onChange={(e) =>
              setSettings({
                ...settings,
                timeLimit: parseInt(e.target.value) || 0,
              })
            }
            className="w-full p-2 border rounded"
            min="1"
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">
            Number of Questions
          </label>
          <input
            type="number"
            value={settings.questionCount}
            onChange={(e) =>
              setSettings({
                ...settings,
                questionCount: parseInt(e.target.value) || 0,
              })
            }
            className="w-full p-2 border rounded"
            min="1"
            max="10"
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Difficulty</label>
          <select
            value={settings.difficulty}
            onChange={(e) =>
              setSettings({ ...settings, difficulty: e.target.value })
            }
            className="w-full p-2 border rounded"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <button
          onClick={handleCreate}
          disabled={isCreating || !isConnected}
          className={`w-full py-2 px-4 rounded text-white transition ${
            isCreating || !isConnected
              ? "bg-gray-400"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isCreating ? "Creating..." : "Create Battle"}
        </button>
      </div>

      {/* Debug information */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg text-xs text-gray-600">
        <p className="font-semibold">Connection Status:</p>
        <p>Socket: {socket ? "Connected" : "Disconnected"}</p>
        <p>Status: {isConnected ? "Live" : "Offline"}</p>
        <p>User: {user?.email || "Not authenticated"}</p>
      </div>
    </div>
  );
}
