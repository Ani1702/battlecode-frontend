"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/contexts/SocketContext";
import { useAuth } from "@/contexts/AuthContext";
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
  const { user } = useAuth();

  const handleCreate = () => {
    if (!user) {
      setError("You must be logged in to create a room");
      return;
    }

    if (isLoading) {
      setError("Connection is being established...");
      return;
    }

    if (!socket || !isConnected) {
      setError("Connection failed. Please refresh the page.");
      return;
    }

    setIsCreating(true);
    setError("");

    const timeout = setTimeout(() => {
      setIsCreating(false);
      setError("Server response timed out");
    }, 10000);

    socket.emit(
      "createMatch",
      {
        timeLimit: settings.timeLimit,
        noOfQuestions: settings.questionCount,
        difficulty: settings.difficulty.toUpperCase(),
      },
      (response: { matchId: string; playerId: string } | { error: string }) => {
        clearTimeout(timeout);
        setIsCreating(false);

        if (!response) {
          setError("No response from server");
          return;
        }

        if ("error" in response) {
          setError(response.error);
          console.error("Match creation error:", response.error);
        } else if ("matchId" in response) {
          console.log(response);
          console.log("Match created:", response.matchId);
          router.push(`/play/${response.matchId}`);
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
    <div className="flex flex-col h-full">
      <div className="flex-[0.2] font-oxanium text-4xl flex justify-center items-end">
        CREATE ROOM
      </div>

      <div className="flex-[0.8] flex flex-row gap-4">
        {/* Left side - Topics */}
        <div className="flex-1 flex-col flex items-end justify-center">
          <div className="flex-[0.1] flex flex-row h-5 w-full">
            <p className="flex-[0.3] flex justify-center items-center w-full mt-2 h-fit">
              TOPICS:
            </p>
            <span className="flex-[0.7] w-full h-fit"> </span>
          </div>
          <div className="flex-[0.9] w-9/10">
            <div className="rounded-lg border-4 border-amber-600 h-9/10 p-4 flex gap-4 items-start">
              <ColoredBtn
                content="Array"
                onClick={() => console.log("Array selected")}
              />
              <ColoredBtn
                content="String"
                onClick={() => console.log("String selected")}
              />
              <ColoredBtn
                content="Backtracking"
                onClick={() => console.log("Backtracking selected")}
              />
            </div>
          </div>
        </div>

        {/* Right side - Settings */}
        <div className="flex-1 flex flex-col h-full">
          <div className="flex-1"></div>
          <div className="flex-1 p-4">
            <p className="font-oxanium text-white text-lg mb-4">COUNTDOWN</p>
            <TimeSlider
              value={settings.timeLimit}
              onChange={(value) =>
                setSettings({ ...settings, timeLimit: value })
              }
            />
          </div>
          <div className="flex-1 p-4">
            <p className="font-oxanium text-white text-lg mb-4">
              NUMBER OF QUESTIONS
            </p>
            <QuestionCountSlider
              value={settings.questionCount}
              onChange={(value) =>
                setSettings({ ...settings, questionCount: value })
              }
            />
          </div>
          <div className="flex-1 p-4">
            <p className="font-oxanium text-white text-lg mb-4">
              SELECT DIFFICULTY
            </p>
            <div className="flex gap-4">
              <div className="flex-1">
                <ColoredBtn
                  content="Easy"
                  onClick={() =>
                    setSettings({ ...settings, difficulty: "easy" })
                  }
                />
              </div>
              <div className="flex-1">
                <ColoredBtn
                  content="Medium"
                  onClick={() =>
                    setSettings({ ...settings, difficulty: "medium" })
                  }
                />
              </div>
              <div className="flex-1">
                <ColoredBtn
                  content="Hard"
                  onClick={() =>
                    setSettings({ ...settings, difficulty: "hard" })
                  }
                />
              </div>
            </div>
          </div>
          <div className="flex-1 p-4 flex justify-center items-center">
            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="font-oxanium text-white text-2xl cursor-pointer hover:text-amber-500 transition-colors"
            >
              {isCreating ? "CREATING..." : "CLICK HERE TO CREATE"}
            </button>
          </div>
          {error && (
            <div className="text-red-500 text-center mb-4">{error}</div>
          )}
          <div className="flex-1"></div>
        </div>
      </div>
    </div>
  );
}
