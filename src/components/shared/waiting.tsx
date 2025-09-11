"use client"
import { useAuth } from "@/contexts/AuthContext";
import CustomScrollbar from "./CustomScrollbar";

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
      <div className="flex bg-[url('/lobby-bg')] bg-cover h-screen flex-col overflow-hidden">
        <div className="flex-shrink-0 ml-5 mt-1 py-4">
          <p> {"<> Battle Arena - Round " + round}</p>
        </div>
        <div className="flex-1 flex min-h-0">
          <div className="flex-[1]"></div>
          <div className="flex-[6] flex justify-center items-center gap-4 flex-col min-h-0">
            {!isRoundActive && !roundStarted ? (
              <>
                <div className="text-4xl text-center">Round {round} Lobby</div>
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
