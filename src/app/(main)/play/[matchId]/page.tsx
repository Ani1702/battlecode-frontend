"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { useSocket } from "@/contexts/SocketContext";
import { useAuth } from "@/contexts/AuthContext";
import ColoredBtn from "@/components/shared/ColoredBtn";
import { PlayerCard } from "@/components/shared/HexagonalCard";

interface Player {
  id: string;
  name: string;
  avatar_url?: string;
  rating?: number;
}

interface MatchData {
  id: string;
  playerAId: string;
  playerBId?: string;
  playerA?: Player;
  playerB?: Player;
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
  const { user, avatarUrl } = useAuth();

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

  // Create player data for UI
  const playerA = match.playerAId
    ? {
        id: match.playerAId,
        name:
          match.playerAId === user?.id
            ? user?.email?.split("@")[0] || "Player 1"
            : match.playerA?.name || "Player 1",
        avatar:
          (match.playerAId === user?.id
            ? avatarUrl
            : match.playerA?.avatar_url) ?? undefined,
        rating:
          match.playerAId === user?.id ? 2450 : match.playerA?.rating || 1500,
        isReady: match.status === "READY" || !!match.playerBId,
      }
    : null;

  const playerB = match.playerBId
    ? {
        id: match.playerBId,
        name:
          match.playerBId === user?.id
            ? user?.email?.split("@")[0] || "Player 2"
            : match.playerB?.name || "Player 2",
        avatar:
          (match.playerBId === user?.id
            ? avatarUrl
            : match.playerB?.avatar_url) ?? undefined,
        rating:
          match.playerBId === user?.id ? 2450 : match.playerB?.rating || 1500,
        isReady: match.status === "READY",
      }
    : null;

  return (
    <div className="flex flex-row h-full p-8 bg-[url('/bg-waiting.svg')] bg-cover bg-center">
      <div className="flex-1 flex justify-center items-center">
        <div className="p-8 rounded-xl bg-black/40 border-2 border-red-500/80 shadow-2xl shadow-red-500/40 w-full font-oxanium text-white h-4/5 justify-center items-start flex">
          <div className="flex flex-col space-y-8">
            <div>
              <h3 className="text-lg mb-4 tracking-wider">TOPICS SELECTED:</h3>
              <div className="flex flex-wrap gap-4">
                {match.settings.topics.map((topic) => (
                  <button
                    key={topic}
                    className="bg-gradient-to-b from-[#D43E3E] to-[#9D2D2D] border border-[#FF5555] rounded-lg px-8 py-2 text-center shadow-md hover:from-[#E04E4E] hover:to-[#A83838]"
                  >
                    <span className="font-semibold text-base tracking-widest">
                      {topic.toUpperCase()}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 text-lg tracking-wider">
              <p>
                TIME:{" "}
                <span className="font-bold">
                  {match.settings.timeLimit} MINS
                </span>
              </p>
              <p>
                NUMBER OF QUESTIONS:{" "}
                <span className="font-bold">
                  {match.settings.noOfQuestions}
                </span>
              </p>
              <p>
                DIFFICULTY LEVEL:{" "}
                <span className="font-bold">
                  {match.settings.difficulty.toUpperCase()}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex-col flex justify-center items-center">
        <div className="flex-1 text-oxanium flex flex-col items-center justify-center text-2xl font-bold">
          <div className="flex-1 flex items-end justify-end">
            YOUR ROOM CODE IS
          </div>
          <div className="flex-1 text-4xl items-center justify-center">
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              {matchId}
            </span>
          </div>
        </div>

        <div className="flex-2 flex flex-row items-center justify-center gap-4 p-4">
          <div className="flex-1">
            {playerA && (
              <PlayerCard
                playerName={playerA.name}
                avatar={playerA.avatar}
                rating={playerA.rating}
                isReady={playerA.isReady}
                size="xl"
              />
            )}
          </div>

          <div className="flex-1">
            {playerB ? (
              <PlayerCard
                playerName={playerB.name}
                avatar={playerB.avatar}
                rating={playerB.rating}
                isReady={playerB.isReady}
                size="xl"
              />
            ) : (
              <PlayerCard playerName="Waiting..." rating="xxxx" size="xl" />
            )}
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          {canStart && (
            <ColoredBtn
              content={isStarting ? "Starting..." : "Start Game"}
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
      </div>

      {/* Debug info */}
      {process.env.NODE_ENV === "development" && (
        <div className="absolute bottom-4 left-4 p-4 bg-gray-900/80 rounded-lg text-xs">
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
