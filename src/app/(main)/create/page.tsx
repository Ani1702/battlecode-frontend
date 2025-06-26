"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/contexts/SocketContext";
import { useAuth } from "@/contexts/AuthContext"; // Add this import
import TimeSlider from "@/components/shared/TimeSlider";
import QuestionCountSlider from "@/components/shared/QuestionCountSlider";
import ColoredBtn from "@/components/shared/ColoredBtn";

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
    <>
      <div className="flex flex-col h-full">
        <div className="flex-[0.2]  font-oxanium text-4xl flex justify-center items-end">
          CREATE ROOM
        </div>

        <div className="flex-[0.8] flex flex-row gap-4">
          <div className="flex-1 flex-col flex items-end justify-center">
            <div className="flex-[0.1] flex flex-row h-5 w-full">
              <p className="flex-[0.3] flex justify-center items-center w-full mt-2 h-fit">TOPICS:</p>
              <span className="flex-[0.7] w-full h-fit"> </span>
            </div>
            <div className="flex-[0.9] w-9/10">
              <div className="rounded-lg border-4 border-amber-600 h-9/10 p-4 flex gap-4 items-start">
                <ColoredBtn content="Array" onClick={() => console.log("Array selected")} />
                <ColoredBtn content="String" onClick={() => console.log("String selected")} />
                <ColoredBtn content="Backtracking" onClick={() => console.log("Backtracking selected")} />
              </div>
            </div>
          </div>


          <div className="flex-1 flex flex-col h-full">
            <div className="flex-1"></div>
            <div className="flex-1 p-4">
              <p className="font-oxanium text-white text-lg mb-4">COUNTDOWN</p>
              <TimeSlider
                value={settings.timeLimit}
                onChange={(value) => setSettings({ ...settings, timeLimit: value })}
              />
            </div>
            <div className="flex-1 p-4">
              <p className="font-oxanium text-white text-lg mb-4">NUMBER OF QUESTIONS</p>
              <QuestionCountSlider
                value={settings.questionCount}
                onChange={(value) => setSettings({ ...settings, questionCount: value })}
              />
            </div>
            <div className="flex-1 p-4">
              <p className="font-oxanium text-white text-lg mb-4">SELECT DIFFICULTY</p>
              <div className="flex gap-4">
                <div className="flex-1">
                  <ColoredBtn 
                    content="Easy" 
                    onClick={() => setSettings({ ...settings, difficulty: "easy" })}
                  />
                </div>
                <div className="flex-1">
                  <ColoredBtn 
                    content="Medium" 
                    onClick={() => setSettings({ ...settings, difficulty: "medium" })}
                  />
                </div>
                <div className="flex-1">
                  <ColoredBtn 
                    content="Hard" 
                    onClick={() => setSettings({ ...settings, difficulty: "hard" })}
                  />
                </div>
              </div>
            </div>
            <div className="flex-1 p-4 flex justify-center items-center cursor-pointer" onClick={() => console.log("Create button clicked!")}>
              <p className="font-oxanium text-white text-2xl">CLICK HERE TO CREATE</p>
            </div>
            <div className="flex-1"></div>
          </div>
        </div>
      </div>

    </>
    //</> <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
    //   <h1 className="text-2xl font-bold mb-6">Create Battle</h1>

    //   {error && (
    //     <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>
    //   )}

    //   <div className="space-y-4">
    //     <div>
    //       <label className="block text-gray-700 mb-2">
    //         Time Limit (minutes)
    //       </label>
    //       <input
    //         type="number"
    //         value={settings.timeLimit}
    //         onChange={(e) => 
    //           setSettings({
    //             ...settings,
    //             timeLimit: parseInt(e.target.value) || 0,
    //           })
    //         }
    //         className="w-full p-2 border rounded"
    //         min="1"
    //       />
    //     </div>

    //     <div>
    //       <label className="block text-gray-700 mb-2">
    //         Number of Questions
    //       </label>
    //       <input
    //         type="number"
    //         value={settings.questionCount}
    //         onChange={(e) => 
    //           setSettings({
    //             ...settings,
    //             questionCount: parseInt(e.target.value) || 0,
    //           })
    //         }
    //         className="w-full p-2 border rounded"
    //         min="1"
    //         max="10"
    //       />
    //     </div>

    //     <div>
    //       <label className="block text-gray-700 mb-2">Difficulty</label>
    //       <select
    //         value={settings.difficulty}
    //         onChange={(e) => 
    //           setSettings({...settings, difficulty: e.target.value })
    //         }
    //         className="w-full p-2 border rounded"
    //       >
    //         <option value="easy">Easy</option>
    //         <option value="medium">Medium</option>
    //         <option value="hard">Hard</option>
    //       </select>
    //     </div>

    //     <button
    //       onClick={handleCreate}
    //       disabled={isCreating || !isConnected}
    //       className={`w-full py-2 px-4 rounded text-white transition ${
    //         isCreating || !isConnected
    //           ? "bg-gray-400"
    //           : "bg-blue-600 hover:bg-blue-700"
    //       }`}
    //     >
    //       {isCreating ? "Creating..." : "Create Battle"}
    //     </button>
    //   </div >

    //   {/* Debug information */}
    //   <div className="mt-6 p-4 bg-gray-50 rounded-lg text-xs text-gray-600">
    //     <p className="font-semibold">Connection Status:</p>
    //     <p>Socket: {socket ? "Connected" : "Disconnected"}</p>
    //     <p>Status: {isConnected ? "Live" : "Offline"}</p>
    //     <p>User: {user?.email || "Not authenticated"}</p>
    //   </div>
    // </div>
    
  );
}
