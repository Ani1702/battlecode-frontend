"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Rocket } from "lucide-react";
import PlayerCard from '@/components/shared/PlayerCard';
import CustomScrollbar from '@/components/shared/CustomScrollbar';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRound2State, Participant } from '@/hooks';
import { showSuccessToast, showErrorToast, showInfoToast } from '@/components/shared/CustomToast';
import LoadingOverlay from '@/components/shared/LoadingOverlay';


// --- Type Definitions ---

interface SimpleSocketResponse {
  success: boolean;
  error?: string;
  message?: string;
}

// --- Component ---

export default function LobbyR2() {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const { userId, isLoading: authLoading, userRole } = useAuth();
  const { state, isLoading: stateLoading, error: stateError, refetch } = useRound2State();
  
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [authenticationChecked, setAuthenticationChecked] = useState(false);
  const hasNavigated = useRef(false);
  
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

  // Authentication check
  useEffect(() => {
    if (!authLoading) setAuthenticationChecked(true);
    if (!authLoading && !userId) router.push('/dashboard');
  }, [authLoading, userId, router]);

  // 🔑 Join Round 2 lobby (THIS IS REQUIRED)
  useEffect(() => {
    if (!socket || !isConnected || !authenticationChecked) return;

    console.debug('[R2 Lobby] Emitting round2:join');
    socket.emit('round2:join', {}, (res?: SimpleSocketResponse) => {
      if (!res?.success) {
        console.error('[R2 Lobby] Failed to join lobby:', res);
        // attempt to fetch canonical state on failure
        if (socket && isConnected) socket.emit('round2:getState');
        return;
      }

      // After successful join, request canonical state so UI updates immediately
      if (typeof refetch === 'function') {
        console.debug('[R2 Lobby] Refetching round2 state after join');
        try {
          refetch();
        } catch (err) {
          console.error('[R2 Lobby] refetch error:', err);
        }
      } else if (socket && isConnected) {
        console.debug('[R2 Lobby] Emitting round2:getState after join');
        socket.emit('round2:getState');
      }
    });
  }, [socket, isConnected, authenticationChecked, refetch]);

  // Listen for backend lobby broadcasts and refetch canonical state
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleLobbyUpdate = () => {
      console.debug('[R2 Lobby] Lobby update → refetching state');
      socket.emit('round2:getState');
    };

    socket.on('round2:lobby', handleLobbyUpdate);

    return () => {
      socket.off('round2:lobby', handleLobbyUpdate);
    };
  }, [socket, isConnected]);

  // 🔑 Request canonical Round 2 state on lobby mount
  useEffect(() => {
    if (!socket || !isConnected) return;

    console.debug('[R2 Lobby] Emitting round2:getState');
    socket.emit('round2:getState');
  }, [socket, isConnected]);

  // State-driven navigation and participant updates
  useEffect(() => {
    if (!state || !state.state || !authenticationChecked) return;

    console.debug('[R2 Lobby] State update:', state);

    // Update participants list from canonical state
    const lobbyParticipants = state.state.participants.filter(p => p.status === 'lobby');
    setParticipants(lobbyParticipants);

    // Auto-navigate if round started AND user has a role (idempotent)
    if (!hasNavigated.current && state.state.round.status === 'IN_PROGRESS' && state.state.currentUser.role) {
      hasNavigated.current = true;
      console.debug('[R2 Lobby] Round started, navigating to role page:', state.state.currentUser.role);
      showInfoToast(`Role assigned: ${state.state.currentUser.role.toUpperCase()}`);
      router.push(`/r2/${state.state.currentUser.role}`);
    }
  }, [state, authenticationChecked, router]);

  // Early return for loading states
  if (authLoading || !authenticationChecked || stateLoading) {
    return (
      <LoadingOverlay 
        isLoading={true} 
        message={authLoading ? "Loading Authentication..." : "Checking Round Status..."}
      />
    );
  }

  // JSX Return
  return (
    <div className="flex flex-col bg-[url('/r0_lobby_bg.svg')] bg-center bg-cover h-screen">
      <div className="flex-shrink-0 orbitron items-center flex flex-col text-7xl" style={{ textShadow: '0 0 10px rgba(8, 145, 178, 1)' }}>
        <p className='flex-1 flex items-end pt-8'> <span className="text-white">ROUND</span> <span className="text-orange-500">&nbsp; 2</span></p>
        <span className="text-orange-500 text-2xl pb-4">LOBBY</span>
      </div>

      <div className='flex-shrink-0 text-2xl orbitron ml-40 pb-4 text-white'>
        Participants: {participants.length}
      </div>

      <div className="flex-1 p-6 min-h-0">
        <CustomScrollbar className="h-full overflow-y-auto">
          <div className="grid grid-cols-3 gap-12 max-w-6xl mx-auto pb-6">
            {participants.length > 0 ? (
              participants.map((participant) => (
                <PlayerCard 
                  key={participant.id || participant.userId}
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
      {state?.state?.round.status === 'LOBBY' && (
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
                <div className="flex justify-center items-center gap-2 mt-2">
                  <div className="bg-green-500 rounded-full h-2 w-2 animate-pulse"></div>
                  <div className="bg-green-500 rounded-full h-2 w-2 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  <div className="bg-green-500 rounded-full h-2 w-2 animate-pulse" style={{ animationDelay: '1s' }}></div>
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

          {isAdmin && participants.length > 0 && (
            <button
              onClick={handleStartRound}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-lg shadow-lg hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm flex items-center gap-2"
              disabled={participants.length < 2}
            >
              <Rocket className="h-4 w-4" />
              Start Round 2
            </button>
          )}
        </div>
      )}
      
      {/* Powered by Judge0 Footer */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
        <p className="text-white/60 text-sm font-oxanium">
          Powered by <span className="text-orange-500 font-semibold">Judge0</span>
        </p>
      </div>
    </div>
  );
}