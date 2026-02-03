"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Rocket } from "lucide-react";
import PlayerCard from '@/components/shared/PlayerCard';
import CustomScrollbar from '@/components/shared/CustomScrollbar';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { showSuccessToast, showErrorToast, showInfoToast } from '@/components/shared/CustomToast';

// --- TYPE DEFINITIONS ---

interface Participant {
  id: string;
  username: string;
  status: 'lobby' | 'elite:idle' | 'challenger:idle' | 'in-match';
  role?: 'elite' | 'challenger';
}

interface LobbyData {
  participants?: Participant[];
  isActive?: boolean;
  [key: string]: unknown;
}

interface SimpleSocketResponse {
  success: boolean;
  error?: string;
  message?: string;
}

interface GetStateResponse extends SimpleSocketResponse {
  participant?: Participant | null;
  isActive?: boolean;
  allParticipants?: Participant[];
  state?: {
    roundIsActive: boolean;
    roundEndTime: number | null;
    userRole: 'elite' | 'challenger' | null;
    activeSession: boolean;
    participants: Participant[];
    elites: string[];
    challengers: string[];
  };
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

interface RoleAssignedData {
  role: 'elite' | 'challenger';
}

interface ErrorData {
  message?: string;
  [key: string]: unknown;
}

// --- COMPONENT ---

export default function LobbyR2() {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const { userId, isLoading: authLoading, userRole } = useAuth();
  
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isRoundActive, setIsRoundActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [roundStarted, setRoundStarted] = useState(false);
  const [hasAttemptedJoin, setHasAttemptedJoin] = useState(false);
  const [authenticationChecked, setAuthenticationChecked] = useState(false);
  const [isCheckingRound, setIsCheckingRound] = useState(true);
  const [currentRoundData, setCurrentRoundData] = useState<CurrentRoundResponse['currentRound'] | null>(null);
  
  const isAdmin = userRole === 'ADMIN';

  // Functions
  const handleStartRound = () => {
    if (!socket || participants.length === 0) return;
    localStorage.removeItem('battlecode-round-2-code-store');
    socket.emit('round2:ready', {}, (response: SimpleSocketResponse) => {
      if (response.success) {
        showSuccessToast('Round 2 started successfully');
      } else {
        showErrorToast(response.error || 'Failed to start the round');
      }
    });
  };

  const handleState = useCallback((response: GetStateResponse) => {
    console.log("Round 2 state response:", response);

    setIsLoading(false);
    setHasAttemptedJoin(true);

    if (!response.success) {
      showErrorToast(response.error || "Could not sync with the server.");
      return;
    }

    // Handle the response.state format for Round 2
    if (response.state) {
      setIsRoundActive(response.state.roundIsActive);
      
      // Check if user should be in an active session
      if (response.state.activeSession && response.state.userRole) {
        showInfoToast("Rejoining your session...");
        router.push(`/r2/${response.state.userRole}`);
        return;
      }

      // Update participants from state
      if (response.state.participants) {
        setParticipants(response.state.participants.filter(p => p.status === "lobby"));
      }
    }

    // Fallback to legacy response format if state is not present
    if (response.allParticipants) {
      setParticipants(response.allParticipants.filter(p => p.status === "lobby"));
    }

    setIsRoundActive(response.isActive ?? response.state?.roundIsActive ?? false);

    if (response.participant) {
      if (response.participant.status === "in-match" && response.participant.role) {
        router.push(`/r2/${response.participant.role}`);
      }
    } else {
      socket?.emit("round2:join", {}, (joinResponse: SimpleSocketResponse) => {
        if (joinResponse.success) {
          showSuccessToast("Successfully joined Round 2 lobby");
        } else {
          showErrorToast(joinResponse.error || "Failed to join lobby");
        }
      });
    }
  }, [router, socket]);

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

      if (currentRound.currentRoundNumber !== 2) {
        showErrorToast("Round 2 is not the current round");
        router.back();
        return;
      }

      if (currentRound.currentRoundStatus !== 'LOBBY') {
        showErrorToast(`Round 2 is currently ${currentRound.currentRoundStatus.toLowerCase()}. Cannot join lobby.`);
        console.log("Current round status:", currentRound.currentRoundStatus);
        router.back();
        return;
      }

      console.log("Round status valid, proceeding to get state");
    });
  }, [socket, isConnected, authenticationChecked, router]);

  // Emit getState useEffect
  useEffect(() => {
    if (!socket || !isConnected || !authenticationChecked || hasAttemptedJoin || isCheckingRound)
      return;

    socket.emit("round2:getState");
  }, [socket, isConnected, authenticationChecked, hasAttemptedJoin, isCheckingRound]);

  // Listen to state response useEffect
  useEffect(() => {
    if (!socket) return;
    socket.on("round2:state", handleState);

    return () => {
      socket.off("round2:state", handleState);
    };
  }, [socket, handleState]);

  // Main Socket event listeners useEffect
  useEffect(() => {
    if (!socket) return;

    const handleLobbyUpdate = (lobbyData: LobbyData) => {
      setIsLoading(false);
      if (lobbyData.participants) setParticipants(lobbyData.participants.filter(p => p.status === 'lobby'));
      if (lobbyData.isActive !== undefined) setIsRoundActive(lobbyData.isActive);
    };

    const handleRoundStarted = () => {
      setRoundStarted(true);
      setIsRoundActive(true);
      localStorage.removeItem('battlecode-round-2-code-store');
      showSuccessToast('Round 2 has started! Assigning roles...');
    };

    const handleRoleAssigned = (data: RoleAssignedData) => {
      if (data.role) {
        showInfoToast(`You have been assigned the role of: ${data.role.toUpperCase()}!`);
        setTimeout(() => {
          router.push(`/r2/${data.role}`);
        }, 2000);
      }
    };
    
    const handleRoundEnd = () => {
      showSuccessToast('Round 2 has ended.');
      router.push('/dashboard');
    };

    const handleError = (error: ErrorData) => {
      const errorMessage = typeof error === 'string' ? error : error?.message || 'An error occurred';
      showErrorToast(errorMessage);
    };

    const handleAdminRemoved = () => {
      console.log("You have been removed from Round 2 by an admin");
      showErrorToast("You have been removed from Round 2 by an admin");
      localStorage.removeItem('battlecode-round-2-code-store');
      router.push('/');
    };

    const handleAdminAdded = () => {
      console.log("You have been added to Round 2 by an admin");
      
      if (!currentRoundData) {
        showErrorToast("Round data not available");
        return;
      }

      const { currentRoundNumber, currentRoundStatus } = currentRoundData;

      if (currentRoundNumber !== 2) {
        showErrorToast("Round 2 is not the current round");
        return;
      }

      if (currentRoundStatus === 'LOBBY') {
        showSuccessToast("You have been added to Round 2! Already in lobby.");
      } else if (currentRoundStatus === 'IN_PROGRESS') {
        showSuccessToast("You have been added to Round 2! Waiting for role assignment...");
      } else if (currentRoundStatus === 'COMPLETED') {
        showErrorToast("Round 2 has already completed");
      } else if (currentRoundStatus === 'LOCKED') {
        showErrorToast("Round 2 is currently locked");
      }
    };

    socket.on('round2:lobbyUpdate', handleLobbyUpdate);
    socket.on('round2:started', handleRoundStarted);
    socket.on('round2:rolesAssigned', handleRoleAssigned);
    socket.on('round2:ended', handleRoundEnd);
    socket.on('round2:error', handleError);
    socket.on('round2:adminRemoved', handleAdminRemoved);
    socket.on('round2:adminAdded', handleAdminAdded);

    return () => {
      socket.off('round2:lobbyUpdate', handleLobbyUpdate);
      socket.off('round2:started', handleRoundStarted);
      socket.off('round2:rolesAssigned', handleRoleAssigned);
      socket.off('round2:ended', handleRoundEnd);
      socket.off('round2:error', handleError);
      socket.off('round2:adminRemoved', handleAdminRemoved);
      socket.off('round2:adminAdded', handleAdminAdded);
    };
  }, [socket, router, currentRoundData]);

  // Early return for loading states
  if (authLoading || !authenticationChecked || isCheckingRound) {
    return (
      <div className="flex items-center justify-center h-screen text-white">
        {authLoading ? "Loading Authentication..." : "Checking Round Status..."}
      </div>
    );
  }

  // JSX Return
  return (
    <div className="flex flex-col bg-[url('/r0_lobby_bg.svg')] bg-center bg-cover h-screen">
      <div className="flex-shrink-0 orbitron items-center flex flex-col text-7xl" style={{ textShadow: '0 0 10px rgba(8, 145, 178, 1)' }}>
        <p className='flex-1 flex items-end pt-8'> <span className="text-white">ROUND</span> <span className="text-orange-500">&nbsp; 2</span></p>
        <span className="text-orange-500 text-2xl pb-4">LOBBY</span>
        
        {(roundStarted || isRoundActive) && (
          <div className="mt-3 flex flex-col items-center gap-2">
            {roundStarted ? (
              <>
                <div className="text-base text-center text-green-400">Round 2 Started!</div>
                <div className="text-gray-200 text-center text-sm">
                  <p>Assigning roles to participants...</p>
                  <div className="flex justify-center items-center gap-2 mt-2">
                    <div className="bg-green-500 rounded-full h-2 w-2 animate-pulse"></div>
                    <div className="bg-green-500 rounded-full h-2 w-2 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                    <div className="bg-green-500 rounded-full h-2 w-2 animate-pulse" style={{ animationDelay: '1s' }}></div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-base text-center text-green-400">Round 2 Active</div>
                <div className="text-gray-200 text-center text-sm">
                  <p>Round is currently in progress</p>
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
          <div className="grid grid-cols-3 gap-12 max-w-6xl mx-auto pb-6">
            {isLoading ? (
              Array.from({ length: 9 }).map((_, index) => (
                <div key={index} className="relative w-full h-[90px] mb-3">
                  <div className="absolute inset-0 w-full h-full bg-gray-800/50 animate-pulse rounded-lg"></div>
                </div>
              ))
            ) : participants.length > 0 ? (
              participants.map((participant) => (
                <PlayerCard 
                  key={participant.id}
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
              disabled={isLoading || participants.length < 2}
            >
              <Rocket className="h-4 w-4" />
              Start Round 2
            </button>
          )}
        </div>
      )}
    </div>
  );
}