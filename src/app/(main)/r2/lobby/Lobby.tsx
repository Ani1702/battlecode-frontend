"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Rocket } from "lucide-react";
import PlayerCard from "@/components/shared/PlayerCard";
import CustomScrollbar from "@/components/shared/CustomScrollbar";
import { useSocket } from "@/contexts/SocketContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  showSuccessToast,
  showErrorToast,
  showInfoToast,
} from "@/components/shared/CustomToast";
import LoadingOverlay from "@/components/shared/LoadingOverlay";

// --- Type Definitions ---

interface Participant {
  userId: string;
  username: string;
  email?: string;
  role?: string;
  status: string;
  rank?: number;
  eventScore?: number;
  socketId?: string;
  joinedAt?: string;
  disconnectedAt?: string;
  reconnectedAt?: string;
  finishedAt?: string;
  cooldownEndTime?: number;
  isReady?: boolean;
}
interface RoundInfo {
  roundNumber: number;
  status: "LOBBY" | "COMPLETED" | "LOCKED" | "IN_PROGRESS";
  isActive: boolean;
  isLocked: boolean;
}

interface CurrentRoundResponse extends SimpleSocketResponse {
  currentRound?: {
    currentRoundNumber: number;
    currentRoundStatus: "LOBBY" | "COMPLETED" | "LOCKED" | "IN_PROGRESS";
    rounds: RoundInfo[];
  };
}

interface SimpleSocketResponse {
  success: boolean;
  error?: string;
  message?: string;
}

// --- Component ---

export default function LobbyR2() {
  const router = useRouter();
  const { socket, isConnected, isLoading: socketLoading } = useSocket();
  const { userId, isLoading: authLoading, userRole } = useAuth();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [authenticationChecked, setAuthenticationChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [roundStatus, setRoundStatus] = useState<
    "LOBBY" | "IN_PROGRESS" | "COMPLETED" | "LOCKED"
  >("LOBBY");
  const hasNavigated = useRef(false);

  const isAdmin = userRole === "ADMIN";

  // Functions
  const handleStartRound = () => {
    if (!socket || participants.length === 0) return;
    localStorage.removeItem("battlecode-round-2-code-store");
    socket.emit("round2:ready", {}, (response: SimpleSocketResponse) => {
      if (response.success) {
        showSuccessToast("Round 2 started successfully");
      } else {
        showErrorToast(response.error || "Failed to start the round");
      }
    });
  };

  useEffect(() => {
    if (!socket || !isConnected || !authenticationChecked) return;

    socket.emit("user:current-round", {}, (response: CurrentRoundResponse) => {
      console.log("Current round response:", response);

      if (!response.success) {
        showErrorToast(response.error || "Failed to check round status");
        router.back();
        return;
      }

      const currentRound = response.currentRound;

      if (!currentRound) {
        showErrorToast("No active round found");
        router.back();
        return;
      }

      if (currentRound.currentRoundNumber !== 2) {
        showErrorToast("Round 2 is not the current round");
        router.back();
        return;
      }

      if (currentRound.currentRoundStatus !== "LOBBY") {
        showErrorToast(
          `Round 2 is currently ${currentRound.currentRoundStatus.toLowerCase()}. Cannot join lobby.`,
        );
        console.log("Current round status:", currentRound.currentRoundStatus);
        router.back();
        return;
      }

      console.log("Round status valid, proceeding to get state");
    });
  }, [socket, isConnected, authenticationChecked, router]);

  // Authentication check
  useEffect(() => {
    if (!authLoading) setAuthenticationChecked(true);
    if (!authLoading && !userId) router.push("/dashboard");
  }, [authLoading, userId, router]);

  // 🔑 Join Round 2 lobby and fetch state
  useEffect(() => {
    if (!socket || !isConnected || !authenticationChecked || socketLoading) {
      console.debug("[R2 Lobby] Waiting for socket/auth:", {
        hasSocket: !!socket,
        isConnected,
        authenticationChecked,
        socketLoading,
      });
      return;
    }

    console.debug("[R2 Lobby] Emitting round2:join");

    // Set a timeout to prevent infinite loading
    const joinTimeout = setTimeout(() => {
      console.error("[R2 Lobby] Join/GetState timeout");
      setIsLoading(false);
      showErrorToast("Failed to connect to lobby. Please refresh.");
    }, 10000); // 10 second timeout

    socket.emit("round2:join", {}, (res?: SimpleSocketResponse) => {
      if (!res?.success) {
        console.error("[R2 Lobby] Failed to join lobby:", res);
        clearTimeout(joinTimeout);
        setIsLoading(false);
        showErrorToast(res?.error || "Failed to join lobby");
        return;
      }

      // After successful join, request state
      console.debug("[R2 Lobby] Emitting round2:getState after join");
      socket.emit("round2:getState", (stateResponse: any) => {
        clearTimeout(joinTimeout);
        console.debug("[R2 Lobby] State response:", stateResponse);

        if (stateResponse?.success) {
          const lobbyParticipants =
            stateResponse.participants?.byStatus?.lobby || [];
          setParticipants(lobbyParticipants);
          setRoundStatus(stateResponse.round?.status || "LOBBY");

          // Auto-navigate if round started AND user has a role
          const userRole = stateResponse.roundSpecific?.role;
          if (
            !hasNavigated.current &&
            stateResponse.round?.status === "IN_PROGRESS" &&
            userRole
          ) {
            hasNavigated.current = true;
            console.debug(
              "[R2 Lobby] Round started, navigating to role page:",
              userRole,
            );
            showInfoToast(`Role assigned: ${userRole.toUpperCase()}`);
            router.push(`/r2/${userRole}`);
          }
        } else {
          console.error("[R2 Lobby] GetState failed:", stateResponse);
          showErrorToast("Failed to get lobby state");
        }

        setIsLoading(false);
      });
    });

    socket.emit("round2:getState");

    return () => {
      clearTimeout(joinTimeout);
    };
  }, [socket, isConnected, authenticationChecked, socketLoading, router]);

  // Listen for lobby updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleRound2Redirect = ({
      target,
      reason,
    }: {
      target: string;
      reason?: string;
    }) => {
      console.warn("[R2 LOBBY REDIRECT]", { target, reason });

      showErrorToast(reason || "You were removed from Round 2");

      // prevent double navigation
      hasNavigated.current = true;

      // clean client state
      localStorage.removeItem("battlecode-round-2-code-store");
      sessionStorage.removeItem("r2_session_type");
      sessionStorage.removeItem("r2_context_id");
      sessionStorage.removeItem("r2_user_role");

      router.replace("/dashboard");
    };

    const handleStateUpdate = (stateResponse: any) => {
      console.debug("[R2 Lobby] State update:", stateResponse);

      if (stateResponse?.success) {
        const lobbyParticipants =
          stateResponse.participants?.byStatus?.lobby || [];
        setParticipants(lobbyParticipants);
        setRoundStatus(stateResponse.round?.status || "LOBBY");

        // Auto-navigate if round started AND user has a role
        const userRole = stateResponse.roundSpecific?.role;
        if (
          !hasNavigated.current &&
          stateResponse.round?.status === "IN_PROGRESS" &&
          userRole
        ) {
          hasNavigated.current = true;
          console.debug(
            "[R2 Lobby] Round started, navigating to role page:",
            userRole,
          );
          showInfoToast(`Role assigned: ${userRole.toUpperCase()}`);
          router.push(`/r2/${userRole}`);
        }

        // Ensure loading is false when we receive updates
        setIsLoading(false);
      }
    };

    const handleLobbyUpdate = () => {
      console.debug("[R2 Lobby] Lobby update → fetching state");
      socket.emit("round2:getState", handleStateUpdate);
    };

    socket.on("round2:lobby", handleLobbyUpdate);
    socket.on("round2:state", handleStateUpdate);
    socket.on("round2:redirect", handleRound2Redirect);

    return () => {
      socket.off("round2:lobby", handleLobbyUpdate);
      socket.off("round2:state", handleStateUpdate);
      socket.off("round2:redirect", handleRound2Redirect);
    };
  }, [socket, isConnected, router]);

  // Early return for loading states
  if (authLoading || !authenticationChecked || isLoading || socketLoading) {
    const loadingMessage = authLoading
      ? "Loading Authentication..."
      : socketLoading
        ? "Connecting to server..."
        : "Checking Round Status...";

    return <LoadingOverlay isLoading={true} message={loadingMessage} />;
  }

  // JSX Return
  return (
    <div className="flex flex-col bg-[url('/r0_lobby_bg.svg')] bg-center bg-cover h-screen">
      <div
        className="flex-shrink-0 orbitron items-center flex flex-col text-7xl"
        style={{ textShadow: "0 0 10px rgba(8, 145, 178, 1)" }}
      >
        <p className="flex-1 flex items-end pt-8">
          {" "}
          <span className="text-white">ROUND</span>{" "}
          <span className="text-orange-500">&nbsp; 2</span>
        </p>
        <span className="text-orange-500 text-2xl pb-4">LOBBY</span>
      </div>

      <div className="flex-shrink-0 text-2xl orbitron ml-40 pb-4 text-white">
        Participants: {participants.length}
      </div>

      <div className="flex-1 p-6 min-h-0">
        <CustomScrollbar className="h-full overflow-y-auto">
          <div className="grid grid-cols-3 gap-12 max-w-6xl mx-auto pb-6">
            {participants.length > 0 ? (
              participants.map((participant, index) => (
                <PlayerCard
                  key={participant.userId || `participant-${index}`}
                  username={participant.username}
                  avatar={`https://ui-avatars.com/api/?name=${encodeURIComponent(participant.username)}&background=0e7490&color=fff`}
                />
              ))
            ) : (
              <div className="col-span-3 flex items-center justify-center text-gray-400 text-base py-12">
                No participants yet. Waiting for players to join...
              </div>
            )}
          </div>
        </CustomScrollbar>
      </div>

      {/* --- BOTTOM STATUS AND CONTROLS SECTION --- */}
      {roundStatus === "LOBBY" && (
        <div className="flex-shrink-0 p-4 flex flex-col items-center gap-3 mb-3">
          <div className="text-sm text-gray-200 text-center">
            {!isConnected ? (
              <div>
                <p className="text-red-400">Connecting to server...</p>
                <div className="flex justify-center items-center gap-2 mt-2">
                  <div className="bg-red-500 rounded-full h-2 w-2 animate-pulse"></div>
                  <div
                    className="bg-red-500 rounded-full h-2 w-2 animate-pulse"
                    style={{ animationDelay: "0.5s" }}
                  ></div>
                  <div
                    className="bg-red-500 rounded-full h-2 w-2 animate-pulse"
                    style={{ animationDelay: "1s" }}
                  ></div>
                </div>
              </div>
            ) : participants.length > 0 ? (
              <div>
                <p className="text-green-400">
                  Connected to lobby. Waiting for more participants...
                </p>
                <div className="flex justify-center items-center gap-2 mt-2">
                  <div className="bg-green-500 rounded-full h-2 w-2 animate-pulse"></div>
                  <div
                    className="bg-green-500 rounded-full h-2 w-2 animate-pulse"
                    style={{ animationDelay: "0.5s" }}
                  ></div>
                  <div
                    className="bg-green-500 rounded-full h-2 w-2 animate-pulse"
                    style={{ animationDelay: "1s" }}
                  ></div>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-green-400">
                  Connected. Waiting for participants to join...
                </p>
                <div className="flex justify-center items-center gap-2 mt-2">
                  <div className="bg-orange-500 rounded-full h-2 w-2 animate-pulse"></div>
                  <div
                    className="bg-orange-500 rounded-full h-2 w-2 animate-pulse"
                    style={{ animationDelay: "0.5s" }}
                  ></div>
                  <div
                    className="bg-orange-500 rounded-full h-2 w-2 animate-pulse"
                    style={{ animationDelay: "1s" }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* {isAdmin && participants.length > 0 && (
            <button
              onClick={handleStartRound}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-lg shadow-lg hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm flex items-center gap-2"
              disabled={participants.length < 2}
            >
              <Rocket className="h-4 w-4" />
              Start Round 2
            </button>
          )} */}
        </div>
      )}

      {/* Powered by Judge0 Footer */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
        <p className="text-white/60 text-sm font-oxanium">
          Powered by{" "}
          <span className="text-orange-500 font-semibold">Judge0</span>
        </p>
      </div>
    </div>
  );
}
