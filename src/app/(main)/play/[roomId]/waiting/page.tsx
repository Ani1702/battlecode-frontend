// Alternative WaitingRoom.tsx - More Robust Parameter Handling
"use client";
import { useEffect, useState } from "react";
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
}

export default function WaitingRoom() {
  const params = useParams();
  const pathname = usePathname();
  const [match, setMatch] = useState<MatchData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const router = useRouter();
  const { socket } = useSocket();
  const { user } = useAuth();

  // Multiple ways to extract gameId for better compatibility
  const getGameId = () => {
    // Method 1: From useParams
    if (params.gameId) {
      return Array.isArray(params.gameId) ? params.gameId[0] : params.gameId;
    }

    // Method 2: From pathname
    const pathSegments = pathname.split("/");
    const waitingIndex = pathSegments.indexOf("waiting");
    if (waitingIndex > 0 && pathSegments[waitingIndex - 1]) {
      return pathSegments[waitingIndex - 1];
    }

    // Method 3: Try to find any segment that looks like a game ID (6 chars, alphanumeric)
    const gameIdPattern = /^[A-Z0-9]{6}$/;
    for (const segment of pathSegments) {
      if (gameIdPattern.test(segment)) {
        return segment;
      }
    }

    return null;
  };

  const gameId = getGameId();

  useEffect(() => {
    console.log("WaitingRoom Debug Info:", {
      params,
      pathname,
      gameId,
      socket: !!socket,
      user: user?.id,
      pathSegments: pathname.split("/"),
    });

    if (!socket) {
      console.log("Socket not available yet");
      return;
    }

    if (!gameId) {
      console.log("GameId not found in URL");
      setError("Game ID not found in URL");
      setLoading(false);
      return;
    }

    if (!user) {
      console.log("User not authenticated yet");
      return;
    }

    // Fetch initial match data
    const fetchMatchData = () => {
      console.log("Fetching match data for:", gameId);
      setLoading(true);
      setError(""); // Clear previous errors

      socket.emit(
        "getMatch",
        { matchId: gameId },
        (response: { match?: MatchData; error?: string }) => {
          console.log("getMatch response:", response);
          setLoading(false);

          if (response.error) {
            console.error("Match fetch error:", response.error);
            setError(response.error);
          } else if (response.match) {
            console.log("Match data received:", response.match);
            setMatch(response.match);
            setError("");
          } else {
            console.error("No match data in response");
            setError("No match data received");
          }
        }
      );
    };

    // Handle match updates
    const handleMatchReady = (data: MatchData) => {
      console.log("Match ready event:", data);
      setMatch(data);
    };

    const handleMatchStarted = () => {
      console.log("Match started, redirecting to game");
      router.push(`/play/${gameId}/code`);
    };

    // Join the room first
    socket.emit("joinRoom", { matchId: gameId });

    // Then fetch match data
    fetchMatchData();

    // Set up event listeners
    socket.on("matchReady", handleMatchReady);
    socket.on("matchStarted", handleMatchStarted);

    return () => {
      console.log("Cleaning up WaitingRoom");
      socket.off("matchReady", handleMatchReady);
      socket.off("matchStarted", handleMatchStarted);
    };
  }, [socket, gameId, router, user, pathname]);

  const handleStartGame = () => {
    if (!socket || !gameId || !match) {
      console.error("Cannot start game - missing dependencies");
      return;
    }

    console.log("Starting game:", gameId);
    setIsStarting(true);
    socket.emit("startMatch", { matchId: gameId });

    // Add timeout to reset starting state if something goes wrong
    setTimeout(() => {
      setIsStarting(false);
    }, 5000);
  };

  const handleRetry = () => {
    if (!socket || !gameId) return;

    setError("");
    setLoading(true);
    socket.emit(
      "getMatch",
      { matchId: gameId },
      (response: { match?: MatchData; error?: string }) => {
        setLoading(false);
        if (response.error) {
          setError(response.error);
        } else if (response.match) {
          setMatch(response.match);
          setError("");
        }
      }
    );
  };

  // Show error for missing gameId
  if (!gameId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-500 mb-4">Invalid game URL</p>
          <p className="text-gray-400 mb-4">Game ID not found in URL</p>
          <ColoredBtn content="Go Back" onClick={() => router.push("/")} />
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p>Loading match data...</p>
          <p className="text-sm text-gray-400 mt-2">Game ID: {gameId}</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <p className="text-sm text-gray-400 mb-4">Game ID: {gameId}</p>
          <ColoredBtn content="Retry" onClick={handleRetry} />
        </div>
      </div>
    );
  }

  // Show no match found
  if (!match) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-500 mb-4">Match not found</p>
          <p className="text-sm text-gray-400 mb-4">Game ID: {gameId}</p>
          <ColoredBtn content="Go Back" onClick={() => router.push("/")} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-8">
      <h1 className="text-4xl font-oxanium text-center mb-8">
        {match.status === "WAITING" ? "Waiting for Players" : "Match Ready"}
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
            <>
              <div className="w-24 h-24 bg-gray-600 rounded-full mb-4 flex items-center justify-center">
                <span className="text-2xl">?</span>
              </div>
              <p className="text-xl text-gray-400">Waiting for opponent...</p>
            </>
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

      {/* Debug Info (remove in production) */}
      <div className="mt-4 p-4 bg-gray-900 rounded-lg text-sm">
        <p>Debug: Game ID: {gameId}</p>
        <p>Debug: User ID: {user?.id}</p>
        <p>Debug: Match Status: {match.status}</p>
        <p>Debug: Socket Connected: {socket ? "Yes" : "No"}</p>
        <p>Debug: Pathname: {pathname}</p>
      </div>

      {/* Start Button */}
      {match.playerAId === user?.id &&
        match.playerBId &&
        match.status === "READY" && (
          <div className="mt-8 flex justify-center">
            <ColoredBtn
              content={isStarting ? "Starting..." : "Start Game"}
              onClick={handleStartGame}
              //   disabled={isStarting}
            />
          </div>
        )}
    </div>
  );
}
