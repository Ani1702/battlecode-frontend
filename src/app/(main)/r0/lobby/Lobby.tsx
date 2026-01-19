"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Rocket } from "lucide-react";
import PlayerCard from '@/components/shared/PlayerCard';
import CustomScrollbar from '@/components/shared/CustomScrollbar';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { showSuccessToast, showErrorToast } from '@/components/shared/CustomToast';

// --- TYPE DEFINITIONS ---

interface Participant {
  id: string;
  userId: string;
  username: string;
  status: 'WAITING' | 'IN_MATCH' | 'DISCONNECTED' | 'FINISHED';
  joinedAt: string;
  isReady: boolean;
  disconnectedAt?: string;
  reconnectedAt?: string;
  finishedAt?: string;
}

interface LobbyData {
  participants?: Participant[];
  isActive?: boolean;
  [key: string]: unknown;
}

interface RoundStartData {
  problems?: unknown[];
  startTime?: number;
  duration?: number;
  [key: string]: unknown;
}

interface SimpleSocketResponse {
  success: boolean;
  error?: string;
}

interface GetStateResponse extends SimpleSocketResponse {
  participant?: Participant | null;
  isActive?: boolean;
  allParticipants?: Participant[];
}

interface RoundInfo {
  roundNumber: number;
  status: 'LOBBY' | 'COMPLETED' | 'LOCKED' | 'IN_PROGRESS';
  isActive: boolean;
  isLocked: boolean;
}

interface CurrentRoundResponse extends SimpleSocketResponse {
  currentRound?: {
    currentRoundNumber: number;
    currentRoundStatus: 'LOBBY' | 'COMPLETED' | 'LOCKED' | 'IN_PROGRESS';
    rounds: RoundInfo[];
  };
}

interface GameStateData {
  success: boolean;
  timeRemaining?: number;
  problems?: unknown[];
  duration?: number;
  [key: string]: unknown;
}

interface TimerData {
  timeRemaining?: number;
}

interface ErrorData {
  message?: string;
  [key: string]: unknown;
}

// --- COMPONENT ---

export default function Lobbyr0() {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const { user, userId, isLoading: authLoading, userRole } = useAuth();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isRoundActive, setIsRoundActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [roundStarted, setRoundStarted] = useState(false);
  const [hasAttemptedJoin, setHasAttemptedJoin] = useState(false);
  const [authenticationChecked, setAuthenticationChecked] = useState(false);
  const [isCheckingRound, setIsCheckingRound] = useState(true);
  const [currentRoundData, setCurrentRoundData] = useState<CurrentRoundResponse['currentRound'] | null>(null);

  const isAdmin = userRole === 'ADMIN';

  // Functions
  const formatTime = (seconds: number) => new Date(seconds * 1000).toISOString().substring(14, 19);

  const handleStartRound = () => {
    if (!socket || participants.length === 0) return;
    localStorage.removeItem(`battlecode-round-0-code-store`);
    socket.emit('round0:ready', {}, (response: SimpleSocketResponse) => {
      if (response.success) {
        showSuccessToast('Round 0 started successfully');
      } else {
        showErrorToast(response.error || 'Failed to start the round');
      }
    });
  };

  const handleState = useCallback((response: GetStateResponse) => {
    console.log("Round 0 state response:", response);

    setIsLoading(false);
    setHasAttemptedJoin(true);

    if (!response.success) {
      showErrorToast(response.error || "Could not sync with the server.");
      return;
    }

    if (response.allParticipants) {
      setParticipants(response.allParticipants.filter(p => p.status === "WAITING"));
    }

    setIsRoundActive(response.isActive ?? false);

    if (response.participant) {
      if (response.participant.status === "IN_MATCH") {
        router.push("/r0/code");
      }
    } 

    
  }, [router, socket, userId, user]);

  // Authentication check useEffect
  useEffect(() => {
    if (!authLoading) setAuthenticationChecked(true);
    if (!authLoading && !userId) router.push('/dashboard');
  }, [authLoading, userId, router]);

  // Check current round useEffect
  useEffect(() => {
    if (!socket || !isConnected || !authenticationChecked) return;

    socket.emit("user:current-round", {}, (response: CurrentRoundResponse) => {
      console.log("Current round response:", response);
      setIsCheckingRound(false);
      
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

      setCurrentRoundData(currentRound);

      if (currentRound.currentRoundNumber !== 0) {
        showErrorToast("Round 0 is not the current round");
        router.back();
        return;
      }

      if (currentRound.currentRoundStatus !== 'LOBBY') {
        showErrorToast(`Round 0 is currently ${currentRound.currentRoundStatus.toLowerCase()}. Cannot join lobby.`);
        console.log("Current round status:", currentRound.currentRoundStatus);
        router.back();
        return;
      }

      console.log("Round status valid, proceeding to get state");
    });
  }, [socket, isConnected, authenticationChecked, router]);

  useEffect(() => {
  if (!socket || !isConnected || !authenticationChecked || isCheckingRound) return;

  console.log("Emitting round0:join");
  socket.emit("round0:join");

}, [socket, isConnected, authenticationChecked, isCheckingRound]);


  // Emit getState useEffect
  useEffect(() => {
    if (!socket || !isConnected || !authenticationChecked || hasAttemptedJoin || isCheckingRound)
      return;

    socket.emit("round0:getState");
  }, [socket, isConnected, authenticationChecked, hasAttemptedJoin, isCheckingRound]);

  // Listen to state response useEffect
  useEffect(() => {
    if (!socket) return;
    socket.on("round0:state", handleState);

    return () => {
      socket.off("round0:state", handleState);
    };
  }, [socket, handleState]);

  // Main Socket event listeners useEffect
  useEffect(() => {
    if (!socket) return;

    const handleLobbyUpdate = (lobbyData: LobbyData) => {
      setIsLoading(false);
      if (lobbyData.participants) setParticipants(lobbyData.participants);
      if (lobbyData.isActive !== undefined) setIsRoundActive(lobbyData.isActive);
    };

    const handleRoundStart = (data: RoundStartData) => {
      if (data && typeof data === 'object' && data.problems && data.startTime) {
        try {
          const dataToStore = {
            problems: data.problems,
            startTime: data.startTime,
            duration: data.duration || 1200
          };
          sessionStorage.setItem('round0_data', JSON.stringify(dataToStore));
        } catch (error) {
          console.error("Failed to save round data to sessionStorage:", error);
          showErrorToast("Error preparing round. Please try again.");
          return;
        }
      } else {
        console.error("Invalid round start data received:", data);
        showErrorToast("Invalid round data received. Please try again.");
        return;
      }

      setRoundStarted(true);
      setIsRoundActive(true);
      localStorage.removeItem('battlecode-round-0-code-store');
      showSuccessToast('Round 0 has started! Redirecting...');

      setTimeout(() => {
        router.push('/r0/code');
      }, 1500);
    };

    const handleTimer = (data: TimerData) => setTimeRemaining(data.timeRemaining || 0);
    
    const handleRoundEnd = () => {
      showSuccessToast('Round 0 has ended.');
      router.push('/dashboard');
    };
    
    const handleError = (error: ErrorData) => {
      const errorMessage = typeof error === 'string' ? error : error?.message || 'An error occurred';
      showErrorToast(errorMessage);
    };

    const handleAdminRemoved = () => {
      console.log("You have been removed from Round 0 by an admin");
      showErrorToast("You have been removed from Round 0 by an admin");
      localStorage.removeItem('battlecode-round-0-code-store');
      sessionStorage.removeItem('round0_data');
      router.push('/dashboard');
    };

    const handleAdminAdded = () => {
      console.log("You have been added to Round 0 by an admin");
      
      if (!currentRoundData) {
        showErrorToast("Round data not available");
        return;
      }

      const { currentRoundNumber, currentRoundStatus } = currentRoundData;

      if (currentRoundNumber !== 0) {
        showErrorToast("Round 0 is not the current round");
        return;
      }

      if (currentRoundStatus === 'LOBBY') {
        showSuccessToast("You have been added to Round 0! Already in lobby.");
      } else if (currentRoundStatus === 'IN_PROGRESS') {
        showSuccessToast("You have been added to Round 0! Redirecting to coding environment...");
        setTimeout(() => router.push('/r0/code'), 1500);
      } else if (currentRoundStatus === 'COMPLETED') {
        showErrorToast("Round 0 has already completed");
      } else if (currentRoundStatus === 'LOCKED') {
        showErrorToast("Round 0 is currently locked");
      }
    };

    socket.on('lobby:round0', handleLobbyUpdate);
    socket.on('round0:start', handleRoundStart);
    socket.on('round0:timer', handleTimer);
    socket.on('round0:end', handleRoundEnd);
    socket.on('round0:error', handleError);
    socket.on('round0:adminRemoved', handleAdminRemoved);
    socket.on('round0:adminAdded', handleAdminAdded);

    return () => {
      socket.off('lobby:round0', handleLobbyUpdate);
      socket.off('round0:start', handleRoundStart);
      socket.off('round0:timer', handleTimer);
      socket.off('round0:end', handleRoundEnd);
      socket.off('round0:error', handleError);
      socket.off('round0:adminRemoved', handleAdminRemoved);
      socket.off('round0:adminAdded', handleAdminAdded);
    };
  }, [socket, router, currentRoundData]);

  // Early return for loading states
  if (authLoading || !authenticationChecked || isCheckingRound) {
    return (
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <Image src="/battlecode_logo.png" alt="Loading..." className="h-50 w-fit animate-pulse" width={200} height={50} />
          </div>
          <p className="text-gray-400">
            {authLoading ? "Loading Authentication..." : "Checking Round Status..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-[url('/r0_lobby_bg.svg')] bg-center bg-cover h-screen">
      <div className="flex-shrink-0 orbitron items-center flex flex-col text-7xl" style={{ textShadow: '0 0 10px rgba(217, 119, 6, 1)' }}>
        <p className='flex-1 flex items-end pt-8'> <span className="text-white">ROUND</span> <span className="text-orange-500">&nbsp; 0</span></p>
        <span className="text-orange-500 text-2xl pb-4">LOBBY</span>
        
        {(roundStarted || isRoundActive) && (
          <div className="mt-3 flex flex-col items-center gap-2">
            {roundStarted ? (
              <>
                <div className="text-base text-center text-green-400">Round 0 Started!</div>
                <div className="text-gray-200 text-center text-sm">
                  <p>Redirecting to coding environment...</p>
                  <div className="flex justify-center items-center gap-2 mt-2">
                    <div className="bg-green-500 rounded-full h-2 w-2 animate-pulse"></div>
                    <div className="bg-green-500 rounded-full h-2 w-2 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                    <div className="bg-green-500 rounded-full h-2 w-2 animate-pulse" style={{ animationDelay: '1s' }}></div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-base text-center text-green-400">Round 0 Active</div>
                <div className="text-gray-200 text-center text-sm">
                  <p>Round is currently in progress</p>
                  <p className="text-orange-400 font-bold mt-1">Time Remaining: {formatTime(timeRemaining)}</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className='flex-shrink-0 text-2xl orbitron ml-40 pb-4 text-white'>
        Participants: {participants.length}
      </div>

      <div className="flex-1 p-6 min-h-0">
        <CustomScrollbar className="h-full overflow-y-auto">
          <div className="grid grid-cols-4 gap-12 max-w-6xl mx-auto pb-6">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="relative w-full h-[90px] mb-3">
                  <div className="absolute inset-0 w-full h-full bg-gray-800/50 animate-pulse rounded-lg"></div>
                </div>
              ))
            ) : participants.length > 0 ? (
              participants.map((participant) => (
                <PlayerCard
                  key={participant.id || participant.userId}
                  username={participant.username}
                  avatar={`https://ui-avatars.com/api/?name=${encodeURIComponent(participant.username)}&background=ea580c&color=fff`}
                />
              ))
            ) : (
              <div className="col-span-4 flex items-center justify-center text-gray-400 text-base py-12">
                No participants yet. Waiting for players to join...
              </div>
            )}
          </div>
        </CustomScrollbar>
      </div>

      {/* --- BOTTOM STATUS AND CONTROLS SECTION --- */}
      {!isRoundActive && !roundStarted && (
        <div className="flex-shrink-0 p-4 flex flex-col items-center gap-3">
          <div className="text-sm text-gray-200 text-center">
            {!isConnected ? (
              <div>
                <p className="text-red-400">Connecting to server...</p>
                <div className="flex justify-center items-center gap-2 mt-2">
                  <div className="bg-red-500 rounded-full h-2 w-2 animate-pulse"></div>
                  <div className="bg-red-500 rounded-full h-2 w-2 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  <div className="bg-red-500 rounded-full h-2 w-2 animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>
              </div>
            ) : participants.length > 0 ? (
              <div>
                <p className="text-green-400">Connected to lobby. Waiting for more participants...</p>
                {!isLoading && (
                  <div className="flex justify-center items-center gap-2 mt-2">
                    <div className="bg-green-500 rounded-full h-2 w-2 animate-pulse"></div>
                    <div className="bg-green-500 rounded-full h-2 w-2 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                    <div className="bg-green-500 rounded-full h-2 w-2 animate-pulse" style={{ animationDelay: '1s' }}></div>
                  </div>
                )}
              </div>
            ) : isLoading ? (
              <div>
                <p className="text-blue-400">Joining lobby...</p>
                <div className="flex justify-center items-center gap-2 mt-2">
                  <div className="bg-blue-500 rounded-full h-2 w-2 animate-pulse"></div>
                  <div className="bg-blue-500 rounded-full h-2 w-2 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  <div className="bg-blue-500 rounded-full h-2 w-2 animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-green-400">Connected. Waiting for participants to join...</p>
                <div className="flex justify-center items-center gap-2 mt-2">
                  <div className="bg-orange-500 rounded-full h-2 w-2 animate-pulse"></div>
                  <div className="bg-orange-500 rounded-full h-2 w-2 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  <div className="bg-orange-500 rounded-full h-2 w-2 animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>
              </div>
            )}
          </div>

          {isAdmin && !isLoading && participants.length > 0 && (
            <button
              onClick={handleStartRound}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-lg shadow-lg hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm flex items-center gap-2"
              disabled={isLoading}
            >
              <Rocket className="h-4 w-4" />
              Start Round 0
            </button>
          )}
        </div>
      )}
    </div>
  );
}