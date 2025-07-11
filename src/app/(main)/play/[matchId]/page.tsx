"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
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
  createdAt?: string;
  questions?: any[];
  scores?: Record<string, number>;
  correctAnswers?: Record<string, number>;
  currentQuestionIndex?: number;
  startedAt?: string;
  completedAt?: string;
}

interface SocketResponse {
  success: boolean;
  error?: string;
  match?: MatchData;
}

export default function WaitingRoom() {
  const params = useParams();
  const router = useRouter();
  const { socket } = useSocket();
  const { user } = useAuth();

  const [match, setMatch] = useState<MatchData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  // Get matchId directly from params
  const matchId = params?.matchId as string;

  // Fetch match data function
  const fetchMatchData = useCallback(
    (id: string) => {
      if (!socket) return;

      console.log(`🔄 Fetching match data for: ${id}`);
      socket.emit("getMatch", { matchId: id }, (response: SocketResponse) => {
        console.log("📥 Get match response:", response);
        setLoading(false);

        if (response.error) {
          console.log("❌ Error from backend:", response.error);
          setError(response.error);
        } else if (response.match) {
          console.log("✅ Match data received:", response.match);
          setMatch(response.match);
          setError("");
        } else {
          console.log("❌ No match data in response");
          setError("Match data not found");
        }
      });
    },
    [socket]
  );

  // Socket event handlers
  const handleMatchReady = useCallback(
    (data: any) => {
      console.log("📢 Match ready event received:", data);
      if (matchId) {
        fetchMatchData(matchId);
      }
    },
    [fetchMatchData, matchId]
  );

  const handleMatchCreated = useCallback((updatedMatch: MatchData) => {
    console.log("📢 Match created event received:", updatedMatch);
    setMatch(updatedMatch);
    setError("");
  }, []);

  const handleMatchStarted = useCallback(
    (data: any) => {
      console.log("📢 Match started event received:", data);
      if (matchId) {
        router.push(`/play/${matchId}/code`);
      }
    },
    [matchId, router]
  );

  // Main effect - set up socket listeners FIRST, then join room
  useEffect(() => {
    if (!socket || !matchId || !user) {
      console.log("❌ Missing dependencies:", {
        socket: !!socket,
        matchId,
        user: !!user,
      });
      return;
    }

    console.log("🔄 Setting up socket listeners for matchId:", matchId);

    // Set up ALL socket listeners BEFORE joining room or emitting events
    socket.on("matchReady", handleMatchReady);
    socket.on("matchCreated", handleMatchCreated);
    socket.on("matchStarted", handleMatchStarted);

    // Join room first
    console.log(`🚪 Joining room: ${matchId}`);
    socket.emit("joinRoom", { matchId }, (response: any) => {
      console.log("📥 Join room response:", response);
      if (response?.success) {
        console.log("✅ Successfully joined room, fetching match data...");
        fetchMatchData(matchId);
      } else {
        console.log("❌ Failed to join room:", response?.error);
        setError(response?.error || "Failed to join match room");
        setLoading(false);
      }
    });

    // Cleanup function
    return () => {
      console.log("🧹 Cleaning up socket listeners");
      socket.off("matchReady", handleMatchReady);
      socket.off("matchCreated", handleMatchCreated);
      socket.off("matchStarted", handleMatchStarted);
    };
  }, [
    socket,
    matchId,
    user,
    handleMatchReady,
    handleMatchCreated,
    handleMatchStarted,
    fetchMatchData,
  ]);

  const handleStartGame = useCallback(() => {
    if (!socket || !match || !matchId) {
      console.log("❌ Cannot start game - missing dependencies");
      return;
    }

    setIsStarting(true);
    setError("");

    console.log(`🎮 Starting match: ${matchId}`);
    socket.emit("startMatch", { matchId }, (response: SocketResponse) => {
      console.log("📥 Start match response:", response);
      setIsStarting(false);

      if (response.error) {
        console.log("❌ Start match error:", response.error);
        setError(response.error);
      } else if (response.success) {
        console.log(
          "✅ Match started successfully - waiting for matchStarted event"
        );
        // Don't navigate here - wait for the matchStarted event
      }
    });
  }, [socket, match, matchId]);

  const handleRetry = useCallback(() => {
    if (!socket || !matchId) return;

    setLoading(true);
    setError("");
    fetchMatchData(matchId);
  }, [socket, matchId, fetchMatchData]);

  const handleGoHome = useCallback(() => {
    router.push("/");
  }, [router]);

  // Handle case where matchId is not available
  if (!matchId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <h2 className="text-xl font-bold mb-2">⚠️ Route Error</h2>
            <p className="mb-4">Match ID not found in URL</p>
          </div>
          <ColoredBtn content="Go Home" onClick={handleGoHome} />
        </div>
      </div>
    );
  }

  // Handle loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p>Loading match data...</p>
          <p className="text-sm text-gray-400 mt-2">Match ID: {matchId}</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <h2 className="text-xl font-bold mb-2">❌ Error</h2>
            <p className="mb-4">{error}</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg mb-4 text-left text-sm">
            <p className="font-bold mb-2">Debug Information:</p>
            <p>Match ID: {matchId}</p>
            <p>User ID: {user?.id || "Not logged in"}</p>
            <p>Socket Connected: {socket ? "Yes" : "No"}</p>
          </div>
          <div className="space-x-4">
            <ColoredBtn content="Retry" onClick={handleRetry} />
            <ColoredBtn content="Go Home" onClick={handleGoHome} />
          </div>
        </div>
      </div>
    );
  }

  // Handle case where match is not found
  if (!match) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-500 mb-4">Match not found</p>
          <p className="text-sm text-gray-400 mb-4">Match ID: {matchId}</p>
          <ColoredBtn content="Go Home" onClick={handleGoHome} />
        </div>
      </div>
    );
  }

  // Determine user roles and permissions
  const isPlayerA = user?.id === match.playerAId;
  const isPlayerB = user?.id === match.playerBId;
  const isParticipant = isPlayerA || isPlayerB;
  const canStart = isPlayerA && match.playerBId && match.status === "READY";

  // Handle case where user is not a participant
  if (!isParticipant) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-500 mb-4">
            You are not a participant in this match
          </p>
          <p className="text-sm text-gray-400 mb-4">Match ID: {matchId}</p>
          <ColoredBtn content="Go Home" onClick={handleGoHome} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-8">
      <h1 className="text-4xl font-oxanium text-center mb-8">
        {match.status === "WAITING" ? "Waiting for Opponent" : "Match Ready"}
      </h1>

      <div className="flex-1 grid grid-cols-2 gap-8 mb-8">
        {/* Player A */}
        <div
          className={`bg-gray-800 rounded-lg p-6 flex flex-col items-center ${
            isPlayerA ? "ring-2 ring-amber-500" : ""
          }`}
        >
          <h2 className="text-2xl font-oxanium mb-4">
            {isPlayerA ? "You" : "Player A"}
          </h2>
          <div className="w-24 h-24 bg-amber-500 rounded-full mb-4 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">A</span>
          </div>
          <p className="text-xl">{isPlayerA ? "Creator" : "Opponent"}</p>
          <p className="text-sm text-gray-400 mt-2">
            ID: {match.playerAId.slice(0, 8)}...
          </p>
        </div>

        {/* Player B */}
        <div
          className={`bg-gray-800 rounded-lg p-6 flex flex-col items-center ${
            isPlayerB ? "ring-2 ring-amber-500" : ""
          }`}
        >
          {match.playerBId ? (
            <>
              <h2 className="text-2xl font-oxanium mb-4">
                {isPlayerB ? "You" : "Player B"}
              </h2>
              <div className="w-24 h-24 bg-amber-500 rounded-full mb-4 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">B</span>
              </div>
              <p className="text-xl">{isPlayerB ? "Joiner" : "Opponent"}</p>
              <p className="text-sm text-gray-400 mt-2">
                ID: {match.playerBId.slice(0, 8)}...
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-oxanium mb-4">Player B</h2>
              <div className="w-24 h-24 bg-gray-600 rounded-full mb-4 flex items-center justify-center">
                <span className="text-2xl">?</span>
              </div>
              <p className="text-xl text-gray-400">Waiting for opponent...</p>
              <div className="mt-4 flex space-x-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse delay-75"></div>
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse delay-150"></div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Match Settings */}
      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-oxanium mb-4">Match Settings</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p>
              <span className="font-bold">Time Limit:</span>{" "}
              {match.settings.timeLimit} minutes
            </p>
            <p>
              <span className="font-bold">Questions:</span>{" "}
              {match.settings.noOfQuestions}
            </p>
            <p>
              <span className="font-bold">Difficulty:</span>{" "}
              <span
                className={`px-2 py-1 rounded text-sm ${
                  match.settings.difficulty === "EASY"
                    ? "bg-green-600"
                    : match.settings.difficulty === "MEDIUM"
                    ? "bg-yellow-600"
                    : "bg-red-600"
                }`}
              >
                {match.settings.difficulty}
              </span>
            </p>
          </div>
          <div>
            <p className="font-bold mb-2">Topics:</p>
            <div className="flex flex-wrap gap-2">
              {match.settings.topics.map((topic, index) => (
                <span
                  key={`${topic}-${index}`}
                  className="bg-amber-600 px-3 py-1 rounded-full text-sm"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Match Info */}
      <div className="bg-gray-800 rounded-lg p-4 mb-8">
        <div className="flex justify-between items-center text-sm text-gray-400">
          <span>Match ID: {match.id}</span>
          <span>Status: {match.status}</span>
          {match.createdAt && (
            <span>Created: {new Date(match.createdAt).toLocaleString()}</span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        {canStart && (
          <ColoredBtn
            content={isStarting ? "Starting..." : "Start Match"}
            onClick={handleStartGame}
          />
        )}

        {match.status === "WAITING" && !isPlayerA && (
          <div className="text-center">
            <p className="text-gray-400 mb-2">
              Waiting for the creator to start the match
            </p>
          </div>
        )}
      </div>

      {/* Debug info */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-8 p-4 bg-gray-900 rounded-lg text-xs">
          <p>
            <strong>🔧 Debug Info:</strong>
          </p>
          <p>Match ID: {matchId}</p>
          <p>User ID: {user?.id}</p>
          <p>Socket Connected: {socket ? "✅" : "❌"}</p>
          <p>Is Player A: {isPlayerA.toString()}</p>
          <p>Is Player B: {isPlayerB.toString()}</p>
          <p>Match Status: {match.status}</p>
        </div>
      )}
    </div>
  );
}
