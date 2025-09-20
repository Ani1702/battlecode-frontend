"use client"
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
import CustomScrollbar from "./CustomScrollbar";
import { useEffect, useState, useCallback } from "react";

interface LobbyPageProps {
  round: string;
  participants: Array<{
    userId: string;
    username: string;
    status: 'WAITING' | 'IN_MATCH' | 'DISCONNECTED' | 'FINISHED' | 'LOBBY' | 'COOLDOWN';
    joinedAt: string;
    isReady: boolean;
    disconnectedAt?: string;
    reconnectedAt?: string;
    finishedAt?: string;
    rank?: number;
    cooldownStartTime?: number;
    waitingSince?: number;
    rawStatus?: string;
  }>;
  isRoundActive: boolean;
  timeRemaining: number;
  roundDuration: number;
  totalParticipants: number;
  isLoading: boolean;
  roundStarted: boolean;
  onStartRound?: () => void;
  onJoinRound?: () => void;
  cooldownTimeRemaining?: number | null;
  isInCooldown?: boolean;
  nextMatchmakingCycle?: number | null;
  isFirstCycle?: boolean;
  isAdmin?: boolean;
}

export default function Waiting({
  round,
  participants,
  isRoundActive,
  timeRemaining,
  roundDuration,
  totalParticipants,
  isLoading,
  roundStarted,
  onStartRound,
  onJoinRound,
  cooldownTimeRemaining,
  isInCooldown,
  nextMatchmakingCycle,
  isFirstCycle,
  isAdmin
}: LobbyPageProps) {
  const { user, userRole } = useAuth();

  // Use the passed isAdmin prop or fallback to userRole check
  const isAdminUser = isAdmin ?? (userRole === 'ADMIN');

  // State for animated bubbles
  const [bubbles, setBubbles] = useState<Array<{
    id: number;
    initials: string;
    x: number;
    y: number;
    size: number;
    speed: number;
    opacity: number;
    color: string;
  }>>([]);

  // Get initials from username
  const getInitials = (username: string): string => {
    const words = username.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    } else if (words.length === 1 && words[0].length >= 2) {
      return words[0].substring(0, 2).toUpperCase();
    } else {
      return (words[0][0] + (words[0][1] || '')).toUpperCase();
    }
  };

  // Create new bubble
  const createBubble = useCallback(() => {
    if (participants.length === 0) return;

    const randomParticipant = participants[Math.floor(Math.random() * participants.length)];
    const initials = getInitials(randomParticipant.username);

    return {
      id: Date.now() + Math.random(),
      initials,
      x: Math.random() * 70, // limit to left 70% to avoid leaderboard area
      y: 110, // start below screen
      size: 40 + Math.random() * 40, // 40-80px
      speed: 0.5 + Math.random() * 1, // 0.5-1.5% per frame
      opacity: 0.3 + Math.random() * 0.4, // 0.3-0.7
      color: 'rgba(239, 68, 68, 0.1)' // very transparent red
    };
  }, [participants]);

  // Animation loop
  useEffect(() => {
    if (participants.length === 0) return;

    const interval = setInterval(() => {
      setBubbles(prevBubbles => {
        let newBubbles = [...prevBubbles];

        // Update existing bubbles
        newBubbles = newBubbles
          .map(bubble => ({
            ...bubble,
            y: bubble.y - bubble.speed,
            // Start fading out when bubble reaches top 10% of screen
            opacity: bubble.y < 10 ? bubble.opacity * 0.95 : bubble.opacity
          }))
          // Remove bubbles when they go off screen at the top
          .filter(bubble => bubble.y > -10);

        // Add new bubble occasionally
        if (Math.random() < 0.3 && newBubbles.length < 15) {
          const newBubble = createBubble();
          if (newBubble) {
            newBubbles.push(newBubble);
          }
        }

        return newBubbles;
      });
    }, 100); // 10fps

    return () => clearInterval(interval);
  }, [participants, createBubble]);

  // Clear bubbles when participants change
  useEffect(() => {
    if (participants.length === 0) {
      setBubbles([]);
    }
  }, [participants.length]);

  // Format time display - FIXED: Better handling of edge cases
  const formatTime = (seconds: number | null | undefined): string => {
    if (typeof seconds !== 'number' || seconds < 0 || isNaN(seconds)) {
        return '00:00';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get status color for participants
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'LOBBY': return 'text-gray-400';
      case 'WAITING': return 'text-yellow-400';
      case 'IN_MATCH': return 'text-green-400';
      case 'COOLDOWN': return 'text-red-400';
      case 'DISCONNECTED': return 'text-red-600';
      case 'FINISHED': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  // FIXED: Enhanced status text logic with better cooldown handling
  const getStatusText = (participant: any): string => {
    const status = participant.rawStatus;
    const isCurrentUser = participant.userId === user?.id;

    switch (status) {
      case 'lobby': return 'In Lobby';
      case 'waiting': {
        if (nextMatchmakingCycle !== null && nextMatchmakingCycle !== undefined && isRoundActive) {
          return `Next Match In: ${nextMatchmakingCycle}s`;
        }
        return 'Waiting for Match';
      }
      case 'in-match': return 'In Match';
      case 'cooldown': {
        // For the current user, show detailed cooldown timer from props
        if (isCurrentUser && isInCooldown && cooldownTimeRemaining && cooldownTimeRemaining > 0) {
          return `Cooldown (${formatTime(cooldownTimeRemaining)})`;
        }
        // For other users, calculate from their cooldownStartTime if available
        else if (!isCurrentUser && participant.cooldownStartTime) {
          const COOLDOWN_DURATION = 2 * 60 * 1000; // 2 minutes in milliseconds
          const elapsed = Date.now() - participant.cooldownStartTime;
          const remaining = Math.max(0, Math.ceil((COOLDOWN_DURATION - elapsed) / 1000));
          if (remaining > 0) {
            return `Cooldown (${formatTime(remaining)})`;
          }
        }
        // Fallback for when we can't determine exact time
        return 'In Cooldown';
      }
      case 'disconnected': return 'Disconnected';
      case 'finished': return 'Finished';
      default: return status || 'Unknown';
    }
  };

  // FIXED: Helper function to get participant-specific cooldown time
  const getParticipantCooldownTime = (participant: any): number | null => {
    const isCurrentUser = participant.userId === user?.id;
    
    // For current user, use the prop from parent component
    if (isCurrentUser && isInCooldown && cooldownTimeRemaining !== null) {
      return cooldownTimeRemaining;
    }
    
    // For other users, calculate from their cooldownStartTime
    if (!isCurrentUser && participant.cooldownStartTime && participant.rawStatus === 'cooldown') {
      const COOLDOWN_DURATION = 2 * 60 * 1000; // 2 minutes in milliseconds
      const elapsed = Date.now() - participant.cooldownStartTime;
      const remaining = Math.max(0, Math.ceil((COOLDOWN_DURATION - elapsed) / 1000));
      return remaining > 0 ? remaining : null;
    }
    
    return null;
  };

  return (
    <>
      <div className="flex bg-[url('/bg_code.png')] bg-cover h-screen flex-col overflow-hidden relative">
        {/* Animated Background Bubbles - floating to the top but avoiding leaderboard */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {bubbles.map(bubble => (
            <div
              key={bubble.id}
              className="absolute rounded-full flex items-center justify-center text-white font-bold text-sm transition-all duration-300 shadow-lg backdrop-blur-sm border border-white/20"
              style={{
                left: `${bubble.x}%`,
                top: `${bubble.y}%`,
                width: `${bubble.size}px`,
                height: `${bubble.size}px`,
                backgroundColor: bubble.color,
                opacity: bubble.opacity,
                fontSize: `${bubble.size * 0.3}px`,
                transform: 'translateX(-50%) translateY(-50%)',
                zIndex: 1
              }}
            >
              {bubble.initials}
            </div>
          ))}
        </div>

        <div className="flex-shrink-0 ml-3 mt-0 py-4 relative z-10 orbitron">
          <p> {"<> BattleCode Arena"}</p>
        </div>
        <div className="flex-1 flex min-h-0 relative z-10">
          <div className="flex-[1]"></div>
          <div className="flex-[6] flex justify-center items-center gap-4 flex-col min-h-0">
            {!isRoundActive ? (
              <>
                <div className="text-5xl text-center bg-gradient-to-r from-[#EEA284] to-[#FF6200] bg-clip-text text-transparent">Searching for opponent</div>
                <div className="text-gray-200 text-center">
                  {participants.length > 0 ? (
                    <div>
                      <p>Waiting for participants to join...</p>
                      <p className="text-orange-400 font-bold mt-2">{totalParticipants} participants ready</p>
                    </div>
                  ) : (
                    <p>Connecting to lobby...</p>
                  )}

                  {!isLoading && (
                    <div className="flex justify-center items-center gap-2 mt-4">
                      <div className="bg-orange-500 rounded-full h-4 w-4 animate-pulse"></div>
                      <div className="bg-orange-500 rounded-full h-4 w-4 animate-pulse" style={{animationDelay: '0.5s'}}></div>
                      <div className="bg-orange-500 rounded-full h-4 w-4 animate-pulse" style={{animationDelay: '1s'}}></div>
                    </div>
                  )}
                </div>

                {/* Admin Start Button */}
                {isAdminUser && !isLoading && totalParticipants > 0 && onStartRound && (
                  <button
                    onClick={onStartRound}
                    className="mt-6 px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-lg shadow-lg hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    disabled={isLoading}
                  >
                    🚀 Start Round {round} (Admin)
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="text-4xl text-center text-green-400">Round {round} Active</div>
                <div className="text-gray-200 text-center space-y-3">
                  {/* Global Round Timer */}
                  <div className="bg-black/40 rounded-lg p-4 border border-amber-600">
                    <p className="text-amber-400 font-bold text-xl">
                      🕐 Round Time Remaining: {formatTime(timeRemaining)}
                    </p>
                    <p className="text-gray-400 text-sm">
                      Total round duration: {Math.floor(roundDuration / 60)} minutes
                    </p>
                  </div>

                  {/* Matchmaking Cycle Timer */}
                  {nextMatchmakingCycle !== null && (
                    <div className="bg-black/40 rounded-lg p-4 border border-blue-600">
                      <p className="text-blue-400 font-bold">
                        🔄 Next Matchmaking Cycle: {nextMatchmakingCycle}s
                      </p>
                      <p className="text-gray-400 text-sm">
                        {isFirstCycle ? 'Initial matches (5s intervals)' : 'Regular matches (3min intervals)'}
                      </p>
                    </div>
                  )}

                  {/* FIXED: Enhanced User Status Display with better cooldown handling */}
                  {isInCooldown && cooldownTimeRemaining !== null && cooldownTimeRemaining > 0 && (
                    <div className="bg-red-900/40 rounded-lg p-4 border border-red-600">
                      <p className="text-red-400 font-bold">
                        ⏳ Cooldown: {formatTime(cooldownTimeRemaining)}
                      </p>
                      <p className="text-gray-400 text-sm">
                        You can join the next matchmaking cycle after cooldown
                      </p>
                    </div>
                  )}

                  {onJoinRound && !isInCooldown && (
                    <button
                      onClick={onJoinRound}
                      className="mt-4 px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-lg shadow-lg hover:scale-105 transition-all duration-300"
                    >
                      Join Round
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="flex-[3] flex flex-col min-h-0">

            <div className="flex-1 max-h-full rounded-lg border-2 mb-4 mr-8 flex flex-col glass-box overflow-hidden">
              <div className="flex-shrink-0 bg-inherit rounded-t-lg z-10 justify-center items-center flex py-4">
                <Image src="/leaderboard-img.svg" alt="Leaderboard Icon" className="w-4 h-4 mr-2" width={16} height={16} />
                <p className="text-2xl text-orange-500">Round {round} Participants</p>
              </div>
              <CustomScrollbar className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
                {participants.length > 0 ? (
                  <table className="w-full text-left text-sm text-white">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="py-2 px-3 font-bold">#</th>
                        <th className="py-2 px-3 font-bold">Player</th>
                        <th className="py-2 px-3 font-bold">Status / Timer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {participants.map((participant, idx) => (
                        <tr key={participant.userId} className="border-gray-800 hover:bg-white/5 transition">
                          <td className="py-2 px-3">{participant.rank || idx + 1}</td>
                          <td className="py-2 px-3 max-w-[120px] truncate">
                            {participant.username}
                            {participant.userId === user?.id && (
                              <span className="ml-2 text-orange-400 text-xs">(You)</span>
                            )}
                          </td>
                          <td className={`py-2 px-3 ${getStatusColor(participant.status)} text-sm`}>
                            {getStatusText(participant)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
                        <span>Loading participants...</span>
                      </div>
                    ) : (
                      <p>No participants yet</p>
                    )}
                  </div>
                )}
              </CustomScrollbar>

            </div>

            {/* FIXED: Enhanced Round Info Panel with better cooldown stats */}
            <div className="flex-shrink-0 rounded-lg border-2 mr-8 glass-box p-4">
              <h3 className="text-lg font-bold text-orange-500 mb-2">Round Stats</h3>
              <div className="text-sm text-gray-300 space-y-1">
                <p>Duration: {Math.floor(roundDuration / 60)} minutes</p>
                <p>Mode: Competitive</p>
                <p>Status: {isRoundActive ? 'Active' : 'Waiting'}</p>
                {timeRemaining > 0 && (
                  <p className="text-orange-400 font-bold">
                    Time Left: {formatTime(timeRemaining)}
                  </p>
                )}

                {/* Participant breakdown */}
                <div className="mt-3 pt-2 border-t border-gray-600">
                  <p className="font-bold text-blue-400 mb-1">Participant Status:</p>
                  <div className="space-y-1 text-xs">
                    <p>🏛️ In Lobby: {participants.filter(p => p.rawStatus === 'lobby').length}</p>
                    <p>⏳ Waiting: {participants.filter(p => p.rawStatus === 'waiting').length}</p>
                    <p>⚔️ In Match: {participants.filter(p => p.rawStatus === 'in-match').length}</p>
                    <p>🛑 Cooldown: {participants.filter(p => p.rawStatus === 'cooldown').length}</p>
                    <p>📡 Disconnected: {participants.filter(p => p.rawStatus === 'disconnected').length}</p>
                  </div>
                </div>

                {/* FIXED: Enhanced Matchmaking info with cooldown details */}
                {isRoundActive && (
                  <div className="mt-3 pt-2 border-t border-gray-600">
                    <p className="font-bold text-green-400 mb-1">Matchmaking:</p>
                    <div className="space-y-1 text-xs">
                      {nextMatchmakingCycle !== null && (
                        <>
                          <p>Next Cycle: {nextMatchmakingCycle}s</p>
                          <p>Mode: {isFirstCycle ? 'Initial (5s)' : 'Regular (3min)'}</p>
                        </>
                      )}
                      
                      {/* Show personal cooldown status */}
                      {isInCooldown && cooldownTimeRemaining !== null && cooldownTimeRemaining > 0 && (
                        <p className="text-red-400">Your Cooldown: {formatTime(cooldownTimeRemaining)}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}