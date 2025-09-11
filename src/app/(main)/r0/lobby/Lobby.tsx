"use client"
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PlayerCard from '@/components/shared/PlayerCard';
import CustomScrollbar from '@/components/shared/CustomScrollbar';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { showSuccessToast, showErrorToast } from '@/components/shared/CustomToast';
// import SocketDebug from '@/components/debug/SocketDebug'; // Uncomment for debugging

interface Participant {
  userId: string;
  username: string;
  status: 'WAITING' | 'IN_MATCH' | 'DISCONNECTED' | 'FINISHED';
  joinedAt: string;
  isReady: boolean;
  disconnectedAt?: string;
  reconnectedAt?: string;
  finishedAt?: string;
}

export default function Lobbyr0(){
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const { user, userId, isLoading: authLoading } = useAuth();
  
  // Real state management
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isRoundActive, setIsRoundActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [roundDuration] = useState(1200); // 20 minutes
  const [isLoading, setIsLoading] = useState(true);
  const [roundStarted, setRoundStarted] = useState(false);
  const [hasJoinedLobby, setHasJoinedLobby] = useState(false);
  const [authenticationChecked, setAuthenticationChecked] = useState(false);
  
  // For testing - all users are admin
  const isAdmin = true; // Changed from: user?.email?.includes('admin') || false;

  // Handle authentication check first
  useEffect(() => {
    // Don't proceed if auth is still loading
    if (authLoading) {
      return;
    }
    
    // Mark authentication as checked
    setAuthenticationChecked(true);
    
    // Check if user is not authenticated after auth loading is complete
    if (!userId || !user) {
      console.warn('User not authenticated for lobby');
      showErrorToast('Please log in to join the lobby');
      router.push('/dashboard');
      return;
    }
  }, [authLoading, userId, user, router]);

  // Join lobby when component mounts and socket is connected
  useEffect(() => {
    // Don't initialize if auth hasn't been checked yet
    if (!authenticationChecked || authLoading) {
      return;
    }
    
    // Don't initialize if user is not authenticated
    if (!userId || !user) {
      return;
    }

    if (socket && isConnected && userId && !hasJoinedLobby) {
      console.log('Attempting to join Round 0 lobby...');
      setIsLoading(true);
      
      // Emit join lobby event
      socket.emit('round0:join', {
        userId: userId,
        username: user?.user_metadata?.full_name || user?.email || 'Anonymous'
      });
      
      setHasJoinedLobby(true);
    }
  }, [socket, isConnected, authenticationChecked, hasJoinedLobby, router]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Listen for lobby updates
    const handleLobbyUpdate = (lobbyData: any) => {
      console.log('Lobby update received:', lobbyData);
      setIsLoading(false);
      
      if (lobbyData.participants) {
        // Convert participants object to array
        const participantsArray = Object.values(lobbyData.participants) as Participant[];
        setParticipants(participantsArray);
      }
    };

    // Listen for round start
    const handleRoundStart = (data: any) => {
      console.log('Round 0 started!', data);
      setRoundStarted(true);
      setIsRoundActive(true);
      showSuccessToast('Round 0 has started! Redirecting...');
      
      // Redirect to code page after a short delay
      setTimeout(() => {
        router.push('/r0/code');
      }, 2000);
    };

    // Listen for timer updates
    const handleTimer = (data: any) => {
      console.log('Timer update:', data);
      setTimeRemaining(data.timeRemaining || 0);
    };

    // Listen for round end
    const handleRoundEnd = (data: any) => {
      console.log('Round 0 ended!', data);
      setIsRoundActive(false);
      setRoundStarted(false);
      showSuccessToast('Round 0 has ended! Redirecting to dashboard...');
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    };

    // Error handling
    const handleError = (error: any) => {
      console.error('Round 0 error:', error);
      showErrorToast(error.message || 'An error occurred');
      setIsLoading(false);
    };

    // Register event listeners
    socket.on('lobby:round0', handleLobbyUpdate);
    socket.on('round0:start', handleRoundStart);
    socket.on('round0:timer', handleTimer);
    socket.on('round0:end', handleRoundEnd);
    socket.on('round0:error', handleError);

    // Cleanup
    return () => {
      socket.off('lobby:round0', handleLobbyUpdate);
      socket.off('round0:start', handleRoundStart);
      socket.off('round0:timer', handleTimer);
      socket.off('round0:end', handleRoundEnd);
      socket.off('round0:error', handleError);
    };
  }, [socket, router]);

  // Admin start round handler
  const handleStartRound = () => {
    if (!socket) {
      showErrorToast('Not connected to server');
      return;
    }
    
    if (participants.length === 0) {
      showErrorToast('No participants in lobby');
      return;
    }

    console.log('Admin starting Round 0...');
    socket.emit('round0:ready');
    showSuccessToast('Starting Round 0...');
  };

  // Handle join round for active rounds
  const handleJoinRound = () => {
    router.push('/r0/code');
  };

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Show loading screen while authentication is being checked
  if (authLoading || !authenticationChecked) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 flex items-center justify-center">
            <img src="/battlecode_logo.png" alt="Loading..." className="h-32 w-fit animate-pulse" />
          </div>
          <p className="text-gray-400 text-lg">
            {authLoading ? "Verifying authentication..." : "Loading lobby..."}
          </p>
        </div>
      </div>
    );
  }

  // Show error if user is not authenticated
  if (!user || !userId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 flex items-center justify-center">
            <img src="/battlecode_logo.png" alt="Error" className="h-32 w-fit opacity-50" />
          </div>
          <p className="text-red-400 text-lg mb-4">Authentication required</p>
          <p className="text-gray-400">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

    return (
        <>
        <div className="flex flex-col bg-[url('/r0_lobby_bg.svg')] bg-center bg-cover min-h-screen max-h-screen">
            {/* Header Section - Much more compact */}
            <div className="flex-shrink-0 pt-8 pb-6 orbitron items-center flex flex-col text-4xl" style={{ textShadow: '0 0 10px rgba(217, 119, 6, 1)' }}>
                <p className='mb-2'> ROUND <span className="text-amber-500">&nbsp; 0</span></p>
                <span className="text-orange-500 text-lg">LOBBY</span>
                
                {/* Testing Mode Indicator */}
                <div className="mt-2 px-3 py-1 bg-blue-600/20 border border-blue-400 rounded text-blue-300 text-xs">
                  🧪 Testing Mode - All users have admin access
                </div>
                
                {/* Round Status */}
                {(roundStarted || isRoundActive) && (
                  <div className="mt-3 flex flex-col items-center gap-2">
                    {roundStarted ? (
                      <>
                        <div className="text-base text-center text-green-400">Round 0 Started!</div>
                        <div className="text-gray-200 text-center text-sm">
                          <p>Redirecting to coding environment...</p>
                          <div className="flex justify-center items-center gap-2 mt-2">
                            <div className="bg-green-500 rounded-full h-2 w-2 animate-pulse"></div>
                            <div className="bg-green-500 rounded-full h-2 w-2 animate-pulse" style={{animationDelay: '0.5s'}}></div>
                            <div className="bg-green-500 rounded-full h-2 w-2 animate-pulse" style={{animationDelay: '1s'}}></div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-base text-center text-green-400">Round 0 Active</div>
                        <div className="text-gray-200 text-center text-sm">
                          <p>Round is currently in progress</p>
                          <p className="text-orange-400 font-bold mt-1">Time Remaining: {formatTime(timeRemaining)}</p>
                          <button
                            onClick={handleJoinRound}
                            className="mt-2 px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded text-sm"
                          >
                            Join Round
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
            </div>
            
            {/* Participants Count */}
            <div className='flex-shrink-0 text-base orbitron ml-10 mb-4'>
                Participants: {participants.length}
            </div>
            
            {/* Main participants grid - takes most of the space */}
            <div className="flex-1 px-6 pb-4 overflow-hidden">
                <CustomScrollbar className="h-full overflow-y-auto">
                    <div className="grid grid-cols-5 gap-5 max-w-6xl mx-auto">
                        {isLoading ? (
                          // Loading state
                          Array.from({ length: 10 }).map((_, index) => (
                            <div key={index} className="relative w-full h-[90px] mb-3">
                              <div className="absolute inset-0 w-full h-full bg-gray-800/50 animate-pulse rounded-lg"></div>
                            </div>
                          ))
                        ) : participants.length > 0 ? (
                          // Show actual participants
                          participants.map((participant, index) => (
                            <PlayerCard 
                                key={participant.userId}
                                username={participant.username}
                                avatar={`https://ui-avatars.com/api/?name=${encodeURIComponent(participant.username)}&background=ea580c&color=fff`}
                            />
                          ))
                        ) : (
                          // Empty state
                          <div className="col-span-5 flex items-center justify-center text-gray-400 text-base py-12">
                            No participants yet. Waiting for players to join...
                          </div>
                        )}
                    </div>
                </CustomScrollbar>
            </div>
            
            {/* Bottom section with waiting message and admin controls */}
            {!isRoundActive && !roundStarted && (
              <div className="flex-shrink-0 p-4 flex flex-col items-center gap-3">
                <div className="text-sm text-gray-200 text-center">
                  {!isConnected ? (
                    <div>
                      <p className="text-red-400">Connecting to server...</p>
                      <div className="flex justify-center items-center gap-2 mt-2">
                        <div className="bg-red-500 rounded-full h-2 w-2 animate-pulse"></div>
                        <div className="bg-red-500 rounded-full h-2 w-2 animate-pulse" style={{animationDelay: '0.5s'}}></div>
                        <div className="bg-red-500 rounded-full h-2 w-2 animate-pulse" style={{animationDelay: '1s'}}></div>
                      </div>
                    </div>
                  ) : participants.length > 0 ? (
                    <div>
                      <p className="text-green-400">Connected to lobby. Waiting for more participants...</p>
                      {!isLoading && (
                        <div className="flex justify-center items-center gap-2 mt-2">
                          <div className="bg-green-500 rounded-full h-2 w-2 animate-pulse"></div>
                          <div className="bg-green-500 rounded-full h-2 w-2 animate-pulse" style={{animationDelay: '0.5s'}}></div>
                          <div className="bg-green-500 rounded-full h-2 w-2 animate-pulse" style={{animationDelay: '1s'}}></div>
                        </div>
                      )}
                    </div>
                  ) : isLoading ? (
                    <div>
                      <p className="text-blue-400">Joining lobby...</p>
                      <div className="flex justify-center items-center gap-2 mt-2">
                        <div className="bg-blue-500 rounded-full h-2 w-2 animate-pulse"></div>
                        <div className="bg-blue-500 rounded-full h-2 w-2 animate-pulse" style={{animationDelay: '0.5s'}}></div>
                        <div className="bg-blue-500 rounded-full h-2 w-2 animate-pulse" style={{animationDelay: '1s'}}></div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-green-400">Connected. Waiting for participants to join...</p>
                      <div className="flex justify-center items-center gap-2 mt-2">
                        <div className="bg-orange-500 rounded-full h-2 w-2 animate-pulse"></div>
                        <div className="bg-orange-500 rounded-full h-2 w-2 animate-pulse" style={{animationDelay: '0.5s'}}></div>
                        <div className="bg-orange-500 rounded-full h-2 w-2 animate-pulse" style={{animationDelay: '1s'}}></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Admin Start Button */}
                {isAdmin && !isLoading && participants.length > 0 && (
                  <button
                    onClick={handleStartRound}
                    className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-lg shadow-lg hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                    disabled={isLoading}
                  >
                    🚀 Start Round 0 (All users are admin for testing)
                  </button>
                )}
              </div>
            )}
        </div>
        {/* <SocketDebug /> */}
        </>
    );
}