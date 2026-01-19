"use client"
import {useState, useCallback} from 'react';
import {useAuth} from "@/contexts/AuthContext";
import { showErrorToast, showInfoToast, showSuccessToast } from "@/components/shared/CustomToast";
import {useRouter} from "next/navigation"
import { useEffect } from 'react';
import { useSocket } from "@/contexts/SocketContext";


interface RoundStatus {
  roundNumber: number;
  status: string;
  isActive: boolean;
  isLocked: boolean;
}

interface CurrentRoundData {
  currentRoundNumber: number;
  currentRoundStatus: string;
  rounds: RoundStatus[];
}

interface SimpleSocketResponse {
    success: boolean;
    error?: string;
}
interface Participant {
  id: string;
  username: string;
  rank: number;
  status: 'lobby' | 'waiting' | 'in-match' | 'cooldown';
  [key: string]: unknown; // Allows for additional properties
}

interface GetStateResponse extends SimpleSocketResponse {
    participant?: Participant | null;
    isActive?: boolean;
    allParticipants?: Participant[]; // Added to correctly type the full list response
    globalTimeRemaining?: number;
    nextMatchmakingCycle?: number | null;
}

interface MatchParticipant {
  id: string;
  username: string;
  status: 'waiting' | 'in-match';
  opponentUsername?: string;
}

export default function Admin() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminLoading, setAdminLoading] = useState(false);
    const { session, isLoading, userRole } = useAuth();
    const [currentRoundData, setCurrentRoundData] = useState<CurrentRoundData | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [selectedRoundForUsers, setSelectedRoundForUsers] = useState(0);
    const [showEndRoundConfirm, setShowEndRoundConfirm] = useState(false);
    const [roundToEnd, setRoundToEnd] = useState<number | null>(null);
    const [showResetRedisConfirm, setShowResetRedisConfirm] = useState(false);
    const [matchParticipants, setMatchParticipants] = useState<MatchParticipant[]>([]);
    const [selectedRoundForMatches, setSelectedRoundForMatches] = useState(0);
    
    // --- Active Round Section State (generalized for any round) ---
    const [activeRoundNumber, setActiveRoundNumber] = useState<number | null>(null);
    const [globalTimeRemaining, setGlobalTimeRemaining] = useState(0);
    const [nextMatchmakingCycle, setNextMatchmakingCycle] = useState<number | null>(null);
    const [cooldownTimeRemaining, setCooldownTimeRemaining] = useState(0);
    const [isRoundActive, setIsRoundActive] = useState(false);
    const [currentUser, setCurrentUser] = useState<Participant | null>(null);
    const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
    
    const { socket } = useSocket();
    const router = useRouter();

    // Load currentRoundData from localStorage on mount
    useEffect(() => {

        const savedRounds = localStorage.getItem('battlecode_rounds');
        if (savedRounds) {
            try {
                setCurrentRoundData(JSON.parse(savedRounds));
            } catch {
                localStorage.removeItem('battlecode_rounds');
            }
        }

        
    }, []);

    const addUserToRound = async (userEmail:string, roundNumber:number) => {
        if (!userEmail || roundNumber === null) {
            showErrorToast('Please enter email and select a round');
            return;
        }
        
        socket?.emit('admin:adduser', 
        { user: { email: userEmail }, round: roundNumber },
        (response: { success: boolean; message: string; error: string; }) => {
        if (response.success) {
            showSuccessToast(`User ${userEmail} added to Round ${roundNumber}`);
            
        } else {
            showErrorToast(response.error || 'Failed to add user');
        }
        }
    );
    };

    const removeUserFromRound = async (userEmail:string, roundNumber:number) => {
        if (!userEmail || roundNumber === null) {
            showErrorToast('Please enter email and select a round');
            return;
        }
        
        socket?.emit('admin:removeuser',
            { user: { email: userEmail }, round: roundNumber },
            (response: { success: boolean; message: string; error: string; }) => {
            if (response.success) {
                showSuccessToast(`User ${userEmail} removed from Round ${roundNumber}`);
            } else {
                showErrorToast(response.error || 'Failed to remove user');
            }
            }
        );
    };

    const fetchLobbyUsers = useCallback((roundNumber: number) => {
        if (!socket) return;
        
        const eventName = `round${roundNumber}:getState`;
        socket?.emit(eventName, {}, (response: GetStateResponse) => {
            if (!response.success) {
                showErrorToast(response.error || "Could not sync with the server.");
                return;
            }
            
            if (response.allParticipants) {

                setParticipants(response.allParticipants.filter(p => p.status === 'lobby'));
            }
        });
    }, [socket]);

    const fetchMatchUsers = useCallback((roundNumber: number) => {
        if (!socket) return;
        
        const eventName = `round${roundNumber}:getState`;
        socket.emit(eventName, {});
    }, [socket]);

    // Listen for the state response event - consolidated for both match participants and active round detection
    useEffect(() => {
        if (!socket) return;

        const handleStateResponse = (roundNum: number) => (response: GetStateResponse) => {
            console.log(`[STATE RESPONSE Round ${roundNum}]`, response);
            if (!response.success) return;
            
            // Check if this round is active and update active round state
            if (response.isActive) {
                setActiveRoundNumber(roundNum);
                setIsRoundActive(true);
                setGlobalTimeRemaining(response.globalTimeRemaining || 0);
                setNextMatchmakingCycle(response.nextMatchmakingCycle || null);
                if (response.participant) setCurrentUser(response.participant);
            } else if (!response.isActive && activeRoundNumber === roundNum) {
                // If this round was active but is no longer, clear it
                setIsRoundActive(false);
                setActiveRoundNumber(null);
            }
            
            if (response.allParticipants) {
                // Filter for users who are either waiting or in-match
                const activeUsers = response.allParticipants.filter(
                    p => p.status === 'waiting' || p.status === 'in-match'
                );
                
                console.log('[ACTIVE USERS]', activeUsers);
                
                // Get users who are in-match
                const inMatchUsers = activeUsers.filter(p => p.status === 'in-match');
                
                // Build match info
                const matchInfo: MatchParticipant[] = activeUsers.map((user) => {
                    const matchData: MatchParticipant = {
                        id: user.id,
                        username: user.username,
                        status: user.status as 'waiting' | 'in-match',
                    };
                    
                    // If user is in-match, try to find their opponent
                    if (user.status === 'in-match') {
                        // First try using opponentId if available
                        if (user.opponentId) {
                            const opponent = response.allParticipants?.find(
                                p => p.id === user.opponentId
                            );
                            if (opponent) {
                                matchData.opponentUsername = opponent.username;
                            }
                        } else if (inMatchUsers.length === 2) {
                            // Fallback: If there are exactly 2 users in-match and no opponentId,
                            // assume they're matched against each other
                            const otherUser = inMatchUsers.find(p => p.id !== user.id);
                            if (otherUser) {
                                matchData.opponentUsername = otherUser.username;
                            }
                        }
                    }
                    
                    return matchData;
                });
                
                console.log('[SETTING MATCH PARTICIPANTS FROM STATE]', matchInfo);
                setMatchParticipants(matchInfo);
                
                // Also set all participants for leaderboard/other uses
                setAllParticipants(response.allParticipants);
            }
        };

        // Listen for state responses from all rounds
        socket.on('round0:state', handleStateResponse(0));
        socket.on('round1:state', handleStateResponse(1));
        socket.on('round2:state', handleStateResponse(2));
        socket.on('round3:state', handleStateResponse(3));

        return () => {
            socket.off('round0:state', handleStateResponse(0));
            socket.off('round1:state', handleStateResponse(1));
            socket.off('round2:state', handleStateResponse(2));
            socket.off('round3:state', handleStateResponse(3));
        };
    }, [socket, activeRoundNumber]);

    const handleStartRound = (roundNumber: number) => {
        if (!socket || participants.length === 0) return;
        socket.emit(`round${roundNumber}:ready`, {}, (response: SimpleSocketResponse) => {
            if (response.success) {
                showSuccessToast(`Round ${roundNumber} started successfully`);
            } else {
                showErrorToast(response.error || 'Failed to start the round');
            }
        });
    };

      const endRound = (roundNumber: number) => {
        if (!socket) {
          showErrorToast('Socket not connected');
          return;
        }

        if (!socket.connected) {
          showErrorToast('Socket disconnected. Please refresh the page.');
          return;
        }
        
        socket.emit("admin:endRound", { roundNumber }, (response: SimpleSocketResponse) => {
          if (response?.success) {
            showSuccessToast(`Round ${roundNumber} ended successfully`);
          } else {
            showErrorToast(response?.error || `Failed to end Round ${roundNumber}`);
          }
        });

        showInfoToast(`Ending Round ${roundNumber}...`);
        setShowEndRoundConfirm(false);
        setRoundToEnd(null);
      };

      const handleEndRoundClick = (roundNumber: number) => {
        
        setRoundToEnd(roundNumber);
        setShowEndRoundConfirm(true);

      };

      const handleCancelEndRound = () => {
        setShowEndRoundConfirm(false);
        setRoundToEnd(null);
      };

      const handleConfirmEndRound = () => {
        if (roundToEnd !== null) {
          endRound(roundToEnd);
        }
      };

    const resetAllRedis = () => {
        if (!socket) {
            showErrorToast('Socket not connected');
            return;
        }

        socket.emit('admin:reset');
        showInfoToast('Resetting Redis...');
        setShowResetRedisConfirm(false);
    };

    const handleResetRedisClick = () => {
        setShowResetRedisConfirm(true);
    };

    const handleCancelResetRedis = () => {
        setShowResetRedisConfirm(false);
    };

    const handleConfirmResetRedis = () => {
        resetAllRedis();
    };

    const fetchRoundData = useCallback(async () => {
        try {
            if (!session?.access_token) return;
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/rounds`, {
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                }
            });
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            const data = await response.json();
            if (data.success && data.data) {
                setCurrentRoundData(data.data);
                localStorage.setItem('battlecode_rounds', JSON.stringify(data.data));
            }
        } catch (error) {
            console.error('Error fetching round data:', error);
            // Fallback to localStorage if API fails
            const savedRounds = localStorage.getItem('battlecode_rounds');
            if (savedRounds) {
                try {
                setCurrentRoundData(JSON.parse(savedRounds));
            } catch (error) {
                console.error('Failed to parse saved rounds:', error);
                localStorage.removeItem('battlecode_rounds');
            }
            }
        }
    }, [session?.access_token]);


    useEffect(() => {
        if (isLoading) return;
       
        const savedRounds = localStorage.getItem('battlecode_rounds');
        if (savedRounds) {
           try {
                setCurrentRoundData(JSON.parse(savedRounds));
            } catch (error) {
                console.error('Failed to parse saved rounds:', error);
                localStorage.removeItem('battlecode_rounds');
            }
        }
        if (userRole !== "ADMIN"){
            router.back();
            return;
            
        }
        setIsAdmin(true);
        if (session?.access_token) {
            fetchRoundData();
        }
        
    }, [isLoading, userRole, router, session?.access_token, fetchRoundData]);

    // Save round data to localStorage whenever it changes
    useEffect(() => {
        if (currentRoundData) {
            localStorage.setItem('battlecode_rounds', JSON.stringify(currentRoundData));
        }
    }, [currentRoundData]);

    // Listen for real-time round status updates via socket (same pattern as dashboard)
    useEffect(() => {
        if (!socket) return;

        const handleCurrentRound = (data: CurrentRoundData) => {
            setCurrentRoundData(data);
        };

        const handleRedisResetSuccess = () => {
            showSuccessToast('Redis cleared successfully');
        };

        socket.on('server:currentRound', handleCurrentRound);
        socket.on('admin:reset:success', handleRedisResetSuccess);
        
        // Request initial round data
        socket.emit('client:getCurrentRound');

        return () => {
            socket.off('server:currentRound', handleCurrentRound);
            socket.off('admin:reset:success', handleRedisResetSuccess);
        };
    }, [socket]);

    // Fetch lobby users whenever socket changes or selected round changes
    useEffect(() => {
        if (!socket) return;
        fetchLobbyUsers(selectedRoundForUsers);
    }, [socket, selectedRoundForUsers, fetchLobbyUsers]);

    // Fetch match users whenever socket changes or selected round for matches changes
    useEffect(() => {
        if (!socket) return;
        fetchMatchUsers(selectedRoundForMatches);
    }, [socket, selectedRoundForMatches, fetchMatchUsers]);

    // Listen for live lobby updates
    useEffect(() => {
        if (!socket) return;

        const handleLobbyUpdate = (roundNumber: number) => (data: { participants?: Participant[] }) => {
            // Only update if this is the currently selected round
            if (roundNumber === selectedRoundForUsers && data.participants) {
                setParticipants(data.participants.filter((p: Participant) => p.status === 'lobby'));
            }
        };

        socket.on('lobby:round0', handleLobbyUpdate(0));
        socket.on('lobby:round1', handleLobbyUpdate(1));
        socket.on('lobby:round2', handleLobbyUpdate(2));
        socket.on('lobby:round3', handleLobbyUpdate(3));

        return () => {
            socket.off('lobby:round0', handleLobbyUpdate(0));
            socket.off('lobby:round1', handleLobbyUpdate(1));
            socket.off('lobby:round2', handleLobbyUpdate(2));
            socket.off('lobby:round3', handleLobbyUpdate(3));
        };
    }, [socket, selectedRoundForUsers]);

    // Listen for live match updates - DISABLED to prevent interference
    // The backend lobby events don't contain reliable match data
    // We only rely on the initial fetch via round:state events
    /*
    useEffect(() => {
        if (!socket) return;

        const handleMatchUpdate = (roundNumber: number) => (data: { participants?: Participant[] }) => {
            console.log(`[LOBBY UPDATE round${roundNumber}]`, data);
            // Only update if this is the currently selected round
            if (roundNumber === selectedRoundForMatches && data.participants && data.participants.length > 0) {
                const activeUsers = data.participants.filter(
                    (p: Participant) => p.status === 'waiting' || p.status === 'in-match'
                );
                
                console.log(`[ACTIVE USERS FROM LOBBY round${roundNumber}]`, activeUsers);
                
                // Only update if we have active users to show
                if (activeUsers.length > 0) {
                    // Get users who are in-match
                    const inMatchUsers = activeUsers.filter(p => p.status === 'in-match');
                    
                    const matchInfo: MatchParticipant[] = activeUsers.map((user: Participant) => {
                        const matchData: MatchParticipant = {
                            id: user.id,
                            username: user.username,
                            status: user.status as 'waiting' | 'in-match',
                        };
                        
                        // If user is in-match, try to find their opponent
                        if (user.status === 'in-match') {
                            // First try using opponentId if available
                            if (user.opponentId) {
                                const opponent = data.participants?.find(
                                    (p: Participant) => p.id === user.opponentId
                                );
                                if (opponent) {
                                    matchData.opponentUsername = opponent.username;
                                }
                            } else if (inMatchUsers.length === 2) {
                                // Fallback: If there are exactly 2 users in-match and no opponentId,
                                // assume they're matched against each other
                                const otherUser = inMatchUsers.find(p => p.id !== user.id);
                                if (otherUser) {
                                    matchData.opponentUsername = otherUser.username;
                                }
                            }
                        }
                        
                        return matchData;
                    });
                    
                    console.log('[SETTING MATCH PARTICIPANTS FROM LOBBY UPDATE]', matchInfo);
                    setMatchParticipants(matchInfo);
                } else {
                    console.log('[NO ACTIVE USERS - NOT CLEARING STATE]');
                }
            }
        };

        socket.on('lobby:round1', handleMatchUpdate(1));
        socket.on('lobby:round2', handleMatchUpdate(2));
        socket.on('lobby:round3', handleMatchUpdate(3));

        return () => {
            socket.off('lobby:round1', handleMatchUpdate(1));
            socket.off('lobby:round2', handleMatchUpdate(2));
            socket.off('lobby:round3', handleMatchUpdate(3));
        };
    }, [socket, selectedRoundForMatches]);
    */

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const resetAllRounds = async () => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/rounds/reset`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
  } catch (error) {
    console.error('Error resetting rounds:', error);
  }
};

    
    

    const updateRoundStatus = async (roundNumber: number, newStatus: string) => {
    if (!isAdmin || adminLoading) return;
    if (!newStatus || roundNumber === null || roundNumber === undefined) return;
    
    setAdminLoading(true);
    
    if ((newStatus === 'COMPLETED' || newStatus === 'LOCKED') && roundNumber === 0) {
      localStorage.removeItem(`battlecode-round-0-code-store`);
    }
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/rounds/${roundNumber}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (response){
        const data = await response.json();
        if (data.success) {
        showSuccessToast(`Round ${roundNumber} ${newStatus.toLowerCase()}`);
        await fetchRoundData();
      } else {
        showErrorToast(data.error || 'Failed to update round status');
      }
      }
      
      

      
    } catch (error) {
      console.error('Error updating round status:', error);
      showErrorToast('Failed to update round status');
    } finally {
      setAdminLoading(false);
    }
  };


 

  const getStatusButtonColor = (currentStatus: string, targetStatus: string) => {
    const statusColors: { [key: string]: string } = {
      'LOCKED': 'bg-gray-600 hover:bg-gray-500',
      'LOBBY': 'bg-orange-600 hover:bg-orange-500',
      'IN_PROGRESS': 'bg-green-600 hover:bg-green-500',
      'COMPLETED': 'bg-purple-600'
    };
    
    if (currentStatus === targetStatus) {
      return statusColors[targetStatus] + ' opacity-50 cursor-not-allowed';
    }
    
    return statusColors[targetStatus];
  };

  const canTransition = (currentStatus: string, targetStatus: string) => {
    const validTransitions: { [key: string]: string[] } = {
      'LOCKED': ['LOBBY'],
      'LOBBY': ['IN_PROGRESS', 'LOCKED'],
      'IN_PROGRESS': ['COMPLETED', 'LOBBY'],
      'COMPLETED': ['LOBBY']
    };
    
    return validTransitions[currentStatus]?.includes(targetStatus) || false;
  };

    // Live decrement timers for globalTimeRemaining and nextMatchmakingCycle
    useEffect(() => {
      if (!isRoundActive) return;
      const interval = setInterval(() => {
        setGlobalTimeRemaining(prev => (typeof prev === 'number' && prev > 0 ? prev - 1 : 0));
        setNextMatchmakingCycle(prev => (typeof prev === 'number' && prev > 0 ? prev - 1 : prev));
      }, 1000);
      return () => clearInterval(interval);
    }, [isRoundActive]);
    // Cooldown timer logic
    useEffect(() => {
      const cooldownInterval = setInterval(() => {
        if (
          currentUser?.status === 'cooldown' &&
          typeof currentUser.cooldownEndTime === 'number' &&
          !isNaN(currentUser.cooldownEndTime)
        ) {
          const remaining = Math.max(0, Math.ceil((currentUser.cooldownEndTime - Date.now()) / 1000));
          setCooldownTimeRemaining(remaining);
        } else {
          if (cooldownTimeRemaining !== 0) setCooldownTimeRemaining(0);
        }
      }, 1000);
      return () => clearInterval(cooldownInterval);
    }, [currentUser, cooldownTimeRemaining]);
    // Format time helper
    const formatTime = (seconds: number | null | undefined): string => {
      if (typeof seconds !== 'number' || seconds < 0 || isNaN(seconds)) return '00:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    const isInCooldown = currentUser?.status === 'cooldown' && cooldownTimeRemaining > 0;

    return (
        <>
        {isAdmin && (
        <div className="min-h-screen w-full bg-[url('/bg-dashboard.svg')] bg-cover bg-center flex items-center justify-center px-5">
          {/* End Round Confirmation Modal */}
          {showEndRoundConfirm && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
              <div className="bg-gray-900 border-2 border-orange-500 rounded-lg p-6 max-w-md w-full">
                <h3 className="text-xl font-bold text-orange-500 mb-4">Confirm End Round</h3>
                <p className="text-white mb-6">
                  Are you sure you want to end Round {roundToEnd}? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleConfirmEndRound}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-medium transition-all"
                  >
                    Yes, End Round
                  </button>
                  <button
                    onClick={handleCancelEndRound}
                    className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded font-medium transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Reset Redis Confirmation Modal */}
          {showResetRedisConfirm && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
              <div className="bg-gray-900 border-2 border-yellow-500 rounded-lg p-6 max-w-md w-full">
                <h3 className="text-xl font-bold text-yellow-500 mb-4">Confirm Reset Redis</h3>
                <p className="text-white mb-6">
                  Are you sure you want to reset Redis for ALL rounds? This will clear all cached data for all rounds (0, 1, 2, 3).
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleConfirmResetRedis}
                    className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded font-medium transition-all"
                  >
                    Yes, Reset All Redis
                  </button>
                  <button
                    onClick={handleCancelResetRedis}
                    className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded font-medium transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="w-full max-w-6xl rounded-lg border-2 border-orange-500/50 glass-box p-6">
            {/* --- Active Round Section (generalized for any round) --- */}
            <div className="mb-8">
              {isRoundActive && activeRoundNumber !== null && (
                <>
                  <div className="text-4xl text-center text-green-400">Round {activeRoundNumber} Active</div>
                  <div className="text-gray-200 text-center space-y-3">
                    <div className="bg-black/40 rounded-lg p-4 border border-amber-600">
                      <p className="text-amber-400 font-bold text-xl">
                        Round Time Remaining: {formatTime(globalTimeRemaining)}
                      </p>
                    </div>
                    <div className="bg-black/40 rounded-lg p-4 border border-blue-600">
                      <p className="text-blue-400 font-bold">
                        {nextMatchmakingCycle !== null ? `Next Match In: ${formatTime(nextMatchmakingCycle)}` : 'Matchmaking in Progress...'}
                      </p>
                      <p className="text-gray-400 text-sm">
                        New matches are formed every 3 minutes.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center mb-6">
              <div className="w-4 h-4 bg-orange-500 rounded-full mr-3 animate-pulse"></div>
              <h3 className="text-2xl font-bold text-orange-500">Admin Controls</h3>
              {adminLoading && (
                <div className="ml-3 w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
            
            <div className="grid grid-cols-4 gap-6">
              {[0, 1, 2, 3].map((roundNum) => {
                const roundData = currentRoundData?.rounds.find(r => r.roundNumber === roundNum);
                const currentStatus = roundData?.status || 'LOCKED';
                
                return (
                  <div key={roundNum} className="space-y-3">
                    <h4 className="text-xl font-semibold text-white text-center">
                      Round {roundNum}
                    </h4>
                    <p className="text-sm text-gray-400 text-center">
                      Current: <span className="text-orange-300 font-medium">{currentStatus}</span>
                    </p>
                    
                    <div className="space-y-2">
                      {['LOBBY', 'IN_PROGRESS', 'COMPLETED', 'LOCKED'].map((status) => {
                        const isCurrentStatus = currentStatus === status;
                        const canMakeTransition = canTransition(currentStatus, status);
                        const isDisabled = isCurrentStatus || !canMakeTransition || adminLoading;
                        
                        return (
                          <button
                            key={status}
                            onClick={() => updateRoundStatus(roundNum, status)}
                            disabled={isDisabled}
                            className={`
                              w-full px-3 py-2 text-sm rounded transition-all duration-200
                              ${getStatusButtonColor(currentStatus, status)}
                              ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
                              text-white font-medium
                            `}
                          >
                            {status.replace('_', ' ')}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-6 text-sm text-gray-400 bg-gray-800/50 rounded-lg p-4">
              <h4 className="text-orange-400 font-medium mb-2">Status Transitions:</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <p className="text-white">• LOCKED → LOBBY: Open for joining</p>
                <p className="text-white">• LOBBY → IN_PROGRESS: Start round</p>
                <p className="text-white">• IN_PROGRESS → COMPLETED: End round</p>
              </div>
            </div>

            {/* User Management Section */}
            <div className="mt-8 bg-gray-800/50 rounded-lg p-6">
              <h4 className="text-orange-400 font-medium mb-4">User Management</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Add User */}
                <div className="space-y-3">
                  <input
                    type="email"
                    placeholder="Email to add"
                    data-add-email
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  />
                  <select
                    defaultValue="0"
                    data-add-round
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  >
                    <option value="0">Round 0</option>
                    <option value="1">Round 1</option>
                    <option value="2">Round 2</option>
                    <option value="3">Round 3</option>
                  </select>
                  <button
                    onClick={() => {
                      const email = (document.querySelector('[data-add-email]') as HTMLInputElement)?.value || '';
                      const round = (document.querySelector('[data-add-round]') as HTMLSelectElement)?.value || '0';
                      addUserToRound(email, parseInt(round));
                    }}
                    className="w-full px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded text-sm font-medium"
                  >
                    Add User
                  </button>
                </div>

                {/* Remove User */}
                <div className="space-y-3">
                  <input
                    type="email"
                    placeholder="Email to remove"
                    data-remove-email
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  />
                  <select
                    defaultValue="0"
                    data-remove-round
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  >
                    <option value="0">Round 0</option>
                    <option value="1">Round 1</option>
                    <option value="2">Round 2</option>
                    <option value="3">Round 3</option>
                  </select>
                  <button
                    onClick={() => {
                      const email = (document.querySelector('[data-remove-email]') as HTMLInputElement)?.value || '';
                      const round = (document.querySelector('[data-remove-round]') as HTMLSelectElement)?.value || '0';
                      removeUserFromRound(email, parseInt(round));
                    }}
                    className="w-full px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-sm font-medium"
                  >
                    Remove User
                  </button>
                </div>
              </div>
            </div>

            {/* End Round Section */}
            <div className="mt-8 bg-gray-800/50 rounded-lg p-6">
              <h4 className="text-orange-400 font-medium mb-4">End Round Controls</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((roundNum) => (
                  <button
                    key={roundNum}
                    onClick={() => handleEndRoundClick(roundNum)}
                    disabled={!socket}
                    className={`px-4 py-3 rounded text-sm font-medium transition-all ${
                      !socket
                        ? 'bg-gray-600 cursor-not-allowed opacity-50'
                        : 'bg-red-600 hover:bg-red-500 hover:scale-105'
                    } text-white`}
                  >
                    End Round {roundNum}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Note: This will trigger the end of the selected round via socket event.
              </p>
            </div>

            {/* Reset Redis Section */}
            <div className="mt-8 bg-gray-800/50 rounded-lg p-6">
              <h4 className="text-orange-400 font-medium mb-4">Reset Redis Controls</h4>
              <div className="flex justify-center">
                <button
                  onClick={handleResetRedisClick}
                  disabled={!socket}
                  className={`px-6 py-3 rounded text-sm font-medium transition-all ${
                    !socket
                      ? 'bg-gray-600 cursor-not-allowed opacity-50'
                      : 'bg-yellow-600 hover:bg-yellow-500 hover:scale-105'
                  } text-white`}
                >
                  Reset All Redis Data
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center">
                Note: This will reset the Redis data for all rounds (0, 1, 2, 3).
              </p>
            </div>

            {/* Lobby Users Section */}
            <div className="mt-8 bg-gray-800/50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-orange-400 font-medium">Lobby Users by Round</h4>
                {participants.length > 0 && (
                  <button
                    onClick={() => handleStartRound(selectedRoundForUsers)}
                    disabled={!socket || participants.length === 0}
                    className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                      !socket || participants.length === 0
                        ? 'bg-gray-600 cursor-not-allowed opacity-50'
                        : 'bg-green-600 hover:bg-green-500 hover:scale-105'
                    } text-white`}
                  >
                    Start Round {selectedRoundForUsers}
                  </button>
                )}
              </div>
              <div className="space-y-4">
                <div className="flex gap-2">
                  {[0, 1, 2, 3].map((round) => (
                    <button
                      key={round}
                      onClick={() => {
                        setSelectedRoundForUsers(round);
                        fetchLobbyUsers(round);
                      }}
                      className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                        selectedRoundForUsers === round
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Round {round}
                    </button>
                  ))}
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  {participants.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-gray-300 text-sm mb-3">
                        {participants.length} user{participants.length !== 1 ? 's' : ''} in lobby
                      </p>
                      <div className="max-h-64 overflow-y-auto space-y-2">
                        {participants.map((participant) => (
                          <div
                            key={participant.id}
                            className="flex items-center justify-between bg-gray-600/50 px-3 py-2 rounded text-sm"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-white">{participant.username}</span>
                            </div>
                            <span className="text-gray-400 text-xs">Rank: {participant.rank}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm text-center py-4">No users in lobby for Round {selectedRoundForUsers}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Match Users Section - IN_PROGRESS Users */}
            <div className="mt-8 bg-gray-800/50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-orange-400 font-medium">Active Users in IN_PROGRESS Rounds</h4>
              </div>
              <div className="space-y-4">
                <div className="flex gap-2">
                  {[0, 1, 2, 3].map((round) => (
                    <button
                      key={round}
                      onClick={() => {
                        setSelectedRoundForMatches(round);
                        fetchMatchUsers(round);
                      }}
                      className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                        selectedRoundForMatches === round
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Round {round}
                    </button>
                  ))}
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  {matchParticipants.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-gray-300 text-sm mb-3">
                        {matchParticipants.length} active user{matchParticipants.length !== 1 ? 's' : ''}
                      </p>
                      <div className="max-h-96 overflow-y-auto space-y-2">
                        {matchParticipants.map((participant) => (
                          <div
                            key={participant.id}
                            className={`bg-gray-600/50 px-4 py-3 rounded border-l-4 ${
                              participant.status === 'in-match' ? 'border-blue-500' : 'border-yellow-500'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${
                                  participant.status === 'in-match' ? 'bg-blue-500' : 'bg-yellow-500'
                                }`}></div>
                                <span className="text-white font-medium">{participant.username}</span>
                              </div>
                              <span className={`text-xs font-semibold uppercase ${
                                participant.status === 'in-match' ? 'text-blue-400' : 'text-yellow-400'
                              }`}>
                                {participant.status === 'in-match' ? 'In Match' : 'Waiting'}
                              </span>
                            </div>
                            {participant.status === 'in-match' && participant.opponentUsername && (
                              <div className="text-sm text-gray-300 mt-2 ml-5">
                                vs <span className="font-medium">{participant.opponentUsername}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm text-center py-4">
                      No active users for Round {selectedRoundForMatches}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Leaderboard Section (from waiting room) */}
            <div className="mt-8 bg-gray-800/50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <img src="/leaderboard-img.svg" alt="Leaderboard Icon" width={16} height={16} />
                <p className="text-2xl text-orange-500 ml-2">Round 1 Participants</p>
              </div>
              <div className="overflow-x-auto">
                {Array.isArray(allParticipants) && allParticipants.length > 0 ? (
                  <table className="w-full text-left text-sm text-white">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="py-2 px-3 font-bold">#</th>
                        <th className="py-2 px-3 font-bold">Player</th>
                        <th className="py-2 px-3 font-bold">Score</th>
                        <th className="py-2 px-3 font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allParticipants
                        .slice()
                        .sort((a, b) => {
                          const aScore = typeof a.eventScore === 'number' ? a.eventScore : 0;
                          const bScore = typeof b.eventScore === 'number' ? b.eventScore : 0;
                          return bScore - aScore;
                        })
                        .map((p, idx) => (
                          <tr key={p.id} className="border-gray-800 hover:bg-white/5 transition">
                            <td className="py-2 px-3">{idx + 1}</td>
                            <td className="py-2 px-3 max-w-[100px] truncate">{p.username}</td>
                            <td className="py-2 px-3 font-mono text-cyan-400">{typeof p.eventScore === 'number' ? p.eventScore : '...'}</td>
                            <td className="py-2 px-3 text-sm">
                              {typeof p.status === 'string' ? p.status.charAt(0).toUpperCase() + p.status.slice(1) : ''}
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
              </div>
            </div>
          </div>
        </div>
      )}

        </>
    )
}