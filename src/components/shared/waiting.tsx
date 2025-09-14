"use client"
import { useAuth } from "@/contexts/AuthContext";
import CustomScrollbar from "./CustomScrollbar";
import { useEffect, useState } from "react";

interface LobbyPageProps {
  round: string;
  participants: Array<{
    userId: string;
    username: string;
    status: 'WAITING' | 'IN_MATCH' | 'DISCONNECTED' | 'FINISHED';
    joinedAt: string;
    isReady: boolean;
    disconnectedAt?: string;
    reconnectedAt?: string;
    finishedAt?: string;
  }>;
  isRoundActive: boolean;
  timeRemaining: number;
  roundDuration: number;
  totalParticipants: number;
  isLoading: boolean;
  roundStarted: boolean;
  onStartRound?: () => void;
  onJoinRound?: () => void;
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
  onJoinRound
}: LobbyPageProps) {
  const { user, userRole } = useAuth();
  
  // Check if current user is admin
  const isAdmin = userRole === 'ADMIN';

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

  // Colors for bubbles
  /*const bubbleColors = [
    'rgba(249, 115, 22, 0.7)', // orange
    'rgba(59, 130, 246, 0.7)', // blue
    'rgba(16, 185, 129, 0.7)', // emerald
    'rgba(139, 92, 246, 0.7)', // violet
    'rgba(236, 72, 153, 0.7)', // pink
    'rgba(245, 158, 11, 0.7)', // amber
    'rgba(20, 184, 166, 0.7)', // teal
    'rgba(239, 68, 68, 0.7)',  // red
  ];*/

  // Create new bubble
  const createBubble = () => {
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
  };

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
  }, [participants]);

  // Clear bubbles when participants change
  useEffect(() => {
    if (participants.length === 0) {
      setBubbles([]);
    }
  }, [participants.length]);

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get status color for participants
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'WAITING': return 'text-yellow-400';
      case 'IN_MATCH': return 'text-green-400';
      case 'DISCONNECTED': return 'text-red-400';
      case 'FINISHED': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  // Get status display text
  const getStatusText = (status: string): string => {
    switch (status) {
      case 'WAITING': return 'Waiting';
      case 'IN_MATCH': return 'Playing';
      case 'DISCONNECTED': return 'Disconnected';
      case 'FINISHED': return 'Finished';
      default: return status;
    }
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
            {!isRoundActive && !roundStarted ? (
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
                {isAdmin && !isLoading && totalParticipants > 0 && onStartRound && (
                  <button
                    onClick={onStartRound}
                    className="mt-6 px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-lg shadow-lg hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    disabled={isLoading}
                  >
                    🚀 Start Round {round} (Admin)
                  </button>
                )}
              </>
            ) : roundStarted ? (
              <>
                <div className="text-4xl text-center text-green-400">Round {round} Started!</div>
                <div className="text-gray-200 text-center">
                  <p>Redirecting to coding environment...</p>
                  <div className="flex justify-center items-center gap-2 mt-4">
                    <div className="bg-green-500 rounded-full h-4 w-4 animate-pulse"></div>
                    <div className="bg-green-500 rounded-full h-4 w-4 animate-pulse" style={{animationDelay: '0.5s'}}></div>
                    <div className="bg-green-500 rounded-full h-4 w-4 animate-pulse" style={{animationDelay: '1s'}}></div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-4xl text-center text-green-400">Round {round} Active</div>
                <div className="text-gray-200 text-center">
                  <p>Round is currently in progress</p>
                  <p className="text-orange-400 font-bold mt-2">Time Remaining: {formatTime(timeRemaining)}</p>
                  {onJoinRound && (
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
                <img src="/leaderboard-img.svg" className="w-4 h-4 mr-2" />
                <p className="text-2xl text-orange-500">Round {round} Participants</p>
              </div>
              <CustomScrollbar className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
                {participants.length > 0 ? (
                  <table className="w-full text-left text-sm text-white">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="py-2 px-3 font-bold">#</th>
                        <th className="py-2 px-3 font-bold">Player</th>
                        <th className="py-2 px-3 font-bold">Status</th>
                        <th className="py-2 px-3 font-bold">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {participants.map((participant, idx) => (
                        <tr key={participant.userId} className="border-gray-800 hover:bg-white/5 transition">
                          <td className="py-2 px-3">{idx + 1}</td>
                          <td className="py-2 px-3 max-w-[120px] truncate">
                            {participant.username}
                            {participant.userId === user?.id && (
                              <span className="ml-2 text-orange-400 text-xs">(You)</span>
                            )}
                          </td>
                          <td className={`py-2 px-3 ${getStatusColor(participant.status)}`}>
                            {getStatusText(participant.status)}
                          </td>
                          <td className="py-2 px-3 text-xs text-gray-400">
                            {new Date(participant.joinedAt).toLocaleTimeString()}
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

            {/* Round Info Panel */}
            <div className="flex-shrink-0 rounded-lg border-2 mr-8 glass-box p-4">
              <h3 className="text-lg font-bold text-orange-500 mb-2">Round Info</h3>
              <div className="text-sm text-gray-300 space-y-1">
                <p>Duration: {Math.floor(roundDuration / 60)} minutes</p>
                <p>Mode: Competitive</p>
                <p>Status: {isRoundActive ? 'Active' : 'Waiting'}</p>
                {timeRemaining > 0 && (
                  <p className="text-orange-400 font-bold">
                    Time Left: {formatTime(timeRemaining)}
                  </p>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
