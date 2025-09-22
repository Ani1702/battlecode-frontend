"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from '@/contexts/SocketContext';
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import CustomScrollbar from "@/components/shared/CustomScrollbar";
import { showSuccessToast, showErrorToast, showInfoToast } from '@/components/shared/CustomToast';

// --- Interfaces ---
interface Participant {
  id: string;
  username: string;
  rank: number;
  status: 'lobby' | 'waiting' | 'in-match' | 'cooldown';
  cooldownEndTime?: number;
  [key: string]: unknown;
}

interface MatchFoundData {
  opponent: { id: string; rank?: number };
  question: { id:string; title: string; };
  startTime: number;
  duration: number;
}

// ============================================================================
// Main Waiting Room Component
// ============================================================================
export default function WaitingRoomR1() {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const { userId, userRole, isLoading: authLoading } = useAuth();

  // --- State Management ---
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [currentUser, setCurrentUser] = useState<Participant | null>(null);
  const [isRoundActive, setIsRoundActive] = useState(false);
  const [globalTimeRemaining, setGlobalTimeRemaining] = useState(0);
  const [cooldownTimeRemaining, setCooldownTimeRemaining] = useState(0);
  const [nextMatchmakingCycle, setNextMatchmakingCycle] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = useMemo(() => userRole === 'ADMIN', [userRole]);
  const isInCooldown = useMemo(() => currentUser?.status === 'cooldown' && cooldownTimeRemaining > 0, [currentUser, cooldownTimeRemaining]);

  // --- Socket Event Listeners ---
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleMatchFound = (data: MatchFoundData) => {
      showSuccessToast('Match found! Redirecting...');
      sessionStorage.setItem('round1_match_data', JSON.stringify(data));
      router.push('/r1/code');
    };

    const handleGlobalTimer = (data: { timeRemaining: number }) => setGlobalTimeRemaining(data.timeRemaining);
    const handleParticipantsUpdate = (data: { participants: Participant[] }) => {
        setAllParticipants(data.participants || []);
        const me = data.participants?.find(p => p.id === userId);
        if (me) setCurrentUser(me);
    };

    const handleCooldownStart = (data: { cooldownEndTime: number }) => {
      showInfoToast("Match finished. Entering 2-minute cooldown.");
      setCurrentUser(prev => prev ? { ...prev, status: 'cooldown', cooldownEndTime: data.cooldownEndTime } : null);
    };

    const handleCooldownEnd = () => {
      showSuccessToast("You are back in the matchmaking queue!");
      setCurrentUser(prev => prev ? { ...prev, status: 'waiting', cooldownEndTime: undefined } : null);
      setCooldownTimeRemaining(0);
    };
    
    const handleRoundStarted = () => {
        showSuccessToast('Round 1 has started!');
        setIsRoundActive(true);
    };

    const handleRoundEnd = () => {
      showInfoToast('Round 1 has ended.');
      router.push('/dashboard');
    };

    const handleMatchmakingCycle = (data: { nextCycle: number }) => {
        setNextMatchmakingCycle(data.nextCycle);
    };

    socket.on('round1:matchFound', handleMatchFound);
    socket.on('round1:started', handleRoundStarted);
    socket.on('round1:cooldown', handleCooldownStart);
    socket.on('round1:cooldownEnd', handleCooldownEnd);
    socket.on('round1:ended', handleRoundEnd);
    socket.on('round1:participantsUpdate', handleParticipantsUpdate);
    socket.on('round1:globalTimer', handleGlobalTimer);
    socket.on('round1:matchmakingCycle', handleMatchmakingCycle);

    return () => {
      socket.off('round1:matchFound', handleMatchFound);
      socket.off('round1:started', handleRoundStarted);
      socket.off('round1:cooldown', handleCooldownStart);
      socket.off('round1:cooldownEnd', handleCooldownEnd);
      socket.off('round1:ended', handleRoundEnd);
      socket.off('round1:participantsUpdate', handleParticipantsUpdate);
      socket.off('round1:globalTimer', handleGlobalTimer);
      socket.off('round1:matchmakingCycle', handleMatchmakingCycle);
    };
  }, [socket, isConnected, router, userId]);

  // --- Initial State Fetch ---
  useEffect(() => {
    if (!socket || !isConnected || !userId) return;

    socket.emit('round1:getState', {}, (response: { success: boolean; isActive?: boolean; globalTimeRemaining?: number; allParticipants?: Participant[]; nextMatchmakingCycle?: number; participant?: Participant; error?: string }) => {
      if (response?.success) {
        setIsRoundActive(response.isActive ?? false);
        setGlobalTimeRemaining(response.globalTimeRemaining || 0);
        setAllParticipants(response.allParticipants || []);
        setNextMatchmakingCycle(response.nextMatchmakingCycle || null);

        const me = response.participant;
        if (me) {
          if (me.status === 'in-match') {
            showInfoToast('Rejoining your active match...');
            router.push('/r1/code');
            return;
          }
          setCurrentUser(me);
        }
      } else {
        showErrorToast(response?.error || "Could not get round state.");
        router.push('/dashboard');
      }
      setIsLoading(false);
    });
  }, [socket, isConnected, userId, router]);

  // --- Client-Side Timers for Smooth UI ---
  useEffect(() => {
    const cooldownInterval = setInterval(() => {
      if (currentUser?.status === 'cooldown' && currentUser.cooldownEndTime) {
        const remaining = Math.max(0, Math.ceil((currentUser.cooldownEndTime - Date.now()) / 1000));
        setCooldownTimeRemaining(remaining);
        // FIX: Automatically transition out of cooldown on the frontend
        if (remaining === 0) {
            setCurrentUser(prev => prev ? { ...prev, status: 'waiting', cooldownEndTime: undefined } : null);
        }
      } else {
        setCooldownTimeRemaining(0);
      }
    }, 1000);
    return () => clearInterval(cooldownInterval);
  }, [currentUser]);

  const handleStartRound = () => {
    if (!isAdmin || !socket) return;
    socket.emit('round1:ready', {}, (response: { success?: boolean; error?: string }) => {
      if (response?.success) {
        showSuccessToast('Round 1 started successfully!');
      } else {
        showErrorToast(response?.error || 'Failed to start round');
      }
    });
  };

  const formatTime = (seconds: number | null | undefined): string => {
    if (typeof seconds !== 'number' || seconds < 0 || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = (participant: Participant): string => {
    switch (participant.status) {
      case 'lobby': return 'In Lobby';
      case 'waiting':
        if (nextMatchmakingCycle !== null && isRoundActive) {
            return `Next Match: ${formatTime(nextMatchmakingCycle)}`;
        }
        return 'Waiting for Match';
      case 'in-match': return 'In Match';
      case 'cooldown':
        const remaining = participant.cooldownEndTime ? Math.max(0, Math.ceil((participant.cooldownEndTime - Date.now()) / 1000)) : 0;
        return `Cooldown (${formatTime(remaining)})`;
      default: return participant.status;
    }
  };
  
  const getStatusColor = (status: string): string => ({
      'lobby': 'text-gray-400',
      'waiting': 'text-yellow-400',
      'in-match': 'text-green-400',
      'cooldown': 'text-red-400'
  }[status] || 'text-gray-400');

  if (authLoading || isLoading) {
    return <div className="flex items-center justify-center h-screen bg-black text-white">Loading Waiting Room...</div>;
  }

  // --- UI Rendering ---
  return (
    <div className="flex bg-[url('/bg_code.png')] bg-cover h-screen flex-col overflow-hidden relative">
      <div className="flex-shrink-0 ml-3 mt-0 py-4 relative z-10 orbitron">
        <p> &lt;&gt; BattleCode Arena</p>
      </div>
      <div className="flex-1 flex min-h-0 relative z-10">
        <div className="flex-[1]"></div>
        <div className="flex-[6] flex justify-center items-center gap-4 flex-col min-h-0">
          {!isRoundActive ? (
            <>
              <div className="text-5xl text-center bg-gradient-to-r from-[#EEA284] to-[#FF6200] bg-clip-text text-transparent">Searching for opponent</div>
              <div className="text-gray-200 text-center">
                <p>Waiting for the round to begin...</p>
                <p className="text-orange-400 font-bold mt-2">{allParticipants.length} participants ready</p>
                <div className="flex justify-center items-center gap-2 mt-4">
                  <div className="bg-orange-500 rounded-full h-4 w-4 animate-pulse"></div>
                  <div className="bg-orange-500 rounded-full h-4 w-4 animate-pulse [animation-delay:0.5s]"></div>
                  <div className="bg-orange-500 rounded-full h-4 w-4 animate-pulse [animation-delay:1s]"></div>
                </div>
              </div>
              {isAdmin && allParticipants.length > 0 && (
                <button
                  onClick={handleStartRound}
                  className="mt-6 px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-lg shadow-lg hover:scale-105 transition-all"
                >
                  🚀 Start Round 1 (Admin)
                </button>
              )}
            </>
          ) : (
            <>
              <div className="text-4xl text-center text-green-400">Round 1 Active</div>
              <div className="text-gray-200 text-center space-y-3">
                <div className="bg-black/40 rounded-lg p-4 border border-amber-600">
                  <p className="text-amber-400 font-bold text-xl">
                    🕐 Round Time Remaining: {formatTime(globalTimeRemaining)}
                  </p>
                </div>
                <div className="bg-black/40 rounded-lg p-4 border border-blue-600">
                  <p className="text-blue-400 font-bold">
                    {nextMatchmakingCycle !== null ? `🔄 Next Match In: ${formatTime(nextMatchmakingCycle)}` : '🔄 Matchmaking in Progress...'}
                  </p>
                  <p className="text-gray-400 text-sm">
                    New matches are formed every 3 minutes.
                  </p>
                </div>
                {isInCooldown && (
                  <div className="bg-red-900/40 rounded-lg p-4 border border-red-600">
                    <p className="text-red-400 font-bold">
                      ⏳ Cooldown: {formatTime(cooldownTimeRemaining)}
                    </p>
                    <p className="text-gray-400 text-sm">
                      You will rejoin matchmaking after cooldown.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <div className="flex-[3] flex flex-col min-h-0">
          <div className="flex-1 max-h-full rounded-lg border-2 mb-4 mr-8 flex flex-col glass-box overflow-hidden">
            <div className="flex-shrink-0 bg-inherit rounded-t-lg z-10 justify-center items-center flex py-4">
              <Image src="/leaderboard-img.svg" alt="Leaderboard Icon" width={16} height={16} />
              <p className="text-2xl text-orange-500 ml-2">Round 1 Participants</p>
            </div>
            <CustomScrollbar className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
              {allParticipants.length > 0 ? (
                <table className="w-full text-left text-sm text-white">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="py-2 px-3 font-bold">#</th>
                      <th className="py-2 px-3 font-bold">Player</th>
                      <th className="py-2 px-3 font-bold">Status / Timer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allParticipants.map((p, idx) => (
                      <tr key={p.id} className="border-gray-800 hover:bg-white/5 transition">
                        <td className="py-2 px-3">{p.rank || idx + 1}</td>
                        <td className="py-2 px-3 max-w-[120px] truncate">
                          {p.username}
                          {p.id === userId && <span className="ml-2 text-orange-400 text-xs">(You)</span>}
                        </td>
                        <td className={`py-2 px-3 ${getStatusColor(p.status)} text-sm`}>
                          {getStatusText(p)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                    <p>No participants in the lobby yet.</p>
                </div>
              )}
            </CustomScrollbar>
          </div>
        </div>
      </div>
    </div>
  )
}

