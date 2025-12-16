"use client"
import {useState} from 'react';
import {useAuth} from "@/contexts/AuthContext";
import { showErrorToast, showSuccessToast } from "@/components/shared/CustomToast";
import {useRef} from 'react';
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
}




export default function Admin() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminLoading, setAdminLoading] = useState(false);
    const { user, session, isLoading, userRole, userName /*username*/ } = useAuth();
    const [currentRoundData, setCurrentRoundData] = useState<CurrentRoundData | null>(null);
    const [islocked, setIsLocked] = useState([true, true, true, true]);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [selectedRoundForUsers, setSelectedRoundForUsers] = useState(0);
    
    const { socket, isConnected } = useSocket();
    const prevUserRef = useRef(user);
    const router = useRouter();

    // Load currentRoundData from localStorage on mount
    useEffect(() => {

        const savedRounds = localStorage.getItem('battlecode_rounds');
        if (savedRounds) {
            try {
                setCurrentRoundData(JSON.parse(savedRounds));
            } catch (error) {
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

    const fetchLobbyUsers = (roundNumber: number) => {
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
    };

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
      if (!socket && (roundNumber !== undefined || roundNumber !== null)) return;
      socket?.emit(`round${roundNumber}:end`, {}, (response: SimpleSocketResponse) =>{
        if (response.success) {
                showSuccessToast(`Round ${roundNumber} started successfully`);
            } else {
                showErrorToast(response.error || 'Failed to start the round');
            }
      });
    };

    const fetchRoundData = async () => {
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
    };


    useEffect(() => {
        if (isLoading) return;
       
        console.log(userRole);
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
        
    }, [isLoading, userRole, router, session?.access_token]);

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
            console.log('Current round data received via socket:', data);
            setCurrentRoundData(data);
        };

        socket.on('server:currentRound', handleCurrentRound);
        
        // Request initial round data
        socket.emit('client:getCurrentRound');

        return () => {
            socket.off('server:currentRound', handleCurrentRound);
        };
    }, [socket]);

    // Fetch lobby users whenever socket changes or selected round changes
    useEffect(() => {
        if (!socket) return;
        fetchLobbyUsers(selectedRoundForUsers);
    }, [socket, selectedRoundForUsers]);

    // Listen for live lobby updates
    useEffect(() => {
        if (!socket) return;

        const handleLobbyUpdate = (roundNumber: number) => (data: any) => {
            // Only update if this is the currently selected round
            if (roundNumber === selectedRoundForUsers && data.participants) {
                setParticipants(data.participants.filter((p: Participant) => p.status === 'lobby' && p.roundNumber === roundNumber));
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

    const resetAllRounds = async () => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/rounds/reset`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log(data.message);
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
  
    return (
        <>
        {isAdmin && (
        <div className="min-h-screen w-full bg-[url('/bg-dashboard.svg')] bg-cover bg-center flex items-center justify-center px-5">
          <div className="w-full max-w-6xl rounded-lg border-2 border-orange-500/50 glass-box p-6">
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
                    onClick={() => endRound(roundNum)}
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
          </div>
        </div>
      )}

        </>
    )
}