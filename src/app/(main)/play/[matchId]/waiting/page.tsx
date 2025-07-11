// WaitingRoom.tsx
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSocket } from "@/contexts/SocketContext";
import { useAuth } from "@/contexts/AuthContext";
import ColoredBtn from "@/components/shared/ColoredBtn";

interface MatchData {
  id: string;
  playerAId: string;
  playerBId?: string;
  status: string;
  settings: {
    timeLimit: number;
    noOfQuestions: number;
    difficulty: string;
    topics: string[];
  };
}

export default function WaitingRoom() {
  const { gameId } = useParams();
  const [match, setMatch] = useState<MatchData | null>(null);
  const [error, setError] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const router = useRouter();
  const { socket } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    if (!socket || !gameId) return;

    const handleMatchReady = (data: MatchData) => {
      setMatch(data);
    };

    const handleMatchStarted = () => {
      router.push(`/play/${gameId}/code`);
    };

    socket.emit("getMatch", { matchId: gameId }, (response: any) => {
      if (response.error) {
        setError(response.error);
      } else {
        setMatch(response.match);
      }
    });

    socket.on("matchReady", handleMatchReady);
    socket.on("matchStarted", handleMatchStarted);

    return () => {
      socket.off("matchReady", handleMatchReady);
      socket.off("matchStarted", handleMatchStarted);
    };
  }, [socket, gameId, router]);

  const handleStartGame = () => {
    if (!socket || !gameId) return;
    setIsStarting(true);
    socket.emit("startMatch", { matchId: gameId });
  };

  if (!match) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Loading match data...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-8">
      <h1 className="text-4xl font-oxanium text-center mb-8">
        Waiting for Players
      </h1>

      <div className="flex-1 grid grid-cols-2 gap-8">
        {/* Player A Card */}
        <div className="bg-gray-800 rounded-lg p-6 flex flex-col items-center">
          <h2 className="text-2xl font-oxanium mb-4">
            {match.playerAId === user?.id ? "You" : "Opponent"}
          </h2>
          <div className="w-24 h-24 bg-amber-500 rounded-full mb-4"></div>
          <p className="text-xl">Player A</p>
        </div>

        {/* Player B Card */}
        <div className="bg-gray-800 rounded-lg p-6 flex flex-col items-center">
          {match.playerBId ? (
            <>
              <h2 className="text-2xl font-oxanium mb-4">
                {match.playerBId === user?.id ? "You" : "Opponent"}
              </h2>
              <div className="w-24 h-24 bg-amber-500 rounded-full mb-4"></div>
              <p className="text-xl">Player B</p>
            </>
          ) : (
            <p className="text-xl">Waiting for opponent...</p>
          )}
        </div>
      </div>

      {/* Match Settings */}
      <div className="mt-8 p-6 bg-gray-800 rounded-lg">
        <h2 className="text-2xl font-oxanium mb-4">Match Settings</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p>Time Limit: {match.settings.timeLimit} seconds</p>
            <p>Questions: {match.settings.noOfQuestions}</p>
            <p>Difficulty: {match.settings.difficulty}</p>
          </div>
          <div>
            <p>Topics:</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {match.settings.topics.map((topic) => (
                <span
                  key={topic}
                  className="bg-amber-600 px-2 py-1 rounded text-sm"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Start Button (only visible to host when both players are ready) */}
      {match.playerAId === user?.id && match.playerBId && (
        <div className="mt-8 flex justify-center">
          <ColoredBtn
            content={isStarting ? "Starting..." : "Start Game"}
            onClick={handleStartGame}
            // disabled={isStarting}  
          />
        </div>
      )}
    </div>
  );
}