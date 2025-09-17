"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { /* FlaskConical, */ Rocket } from "lucide-react";
import PlayerCard from '@/components/shared/PlayerCard';
import CustomScrollbar from '@/components/shared/CustomScrollbar';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { showSuccessToast, showErrorToast } from '@/components/shared/CustomToast';

interface Participant {
  id: string;
  username: string;
  rank: number;
  status: 'lobby' | 'waiting' | 'in-match' | 'cooldown';
  joinedAt: string;
  socketId?: string;
  waitingSince?: number;
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

interface MatchFoundData {
  matchId?: string;
  opponent?: Participant;
  startTime?: number;
  duration?: number;
  [key: string]: unknown;
}

interface ErrorData {
  message?: string;
  [key: string]: unknown;
}

export default function Lobbyr1(){
    const router = useRouter();
    const { socket, isConnected } = useSocket();
    const { user, userId, isLoading: authLoading } = useAuth();
    
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [isRoundActive, setIsRoundActive] = useState(false);
    const [timeRemaining, /*setTimeRemaining*/] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [roundStarted, setRoundStarted] = useState(false);
    const [hasJoinedLobby, setHasJoinedLobby] = useState(false);
    const [authenticationChecked, setAuthenticationChecked] = useState(false);
    
    // For now, all users can start rounds (will be moved to admin panel later)
    const isAdmin = true; // user?.role === 'ADMIN';
    // Authentication check
    useEffect(() => {
        if (authLoading) return;
        setAuthenticationChecked(true);
        if (!userId || !user) {
            router.push('/dashboard');
        }
    }, [authLoading, userId, user, router]);

    // Join lobby when authenticated and connected
    useEffect(() => {
        if (!authenticationChecked || authLoading || !userId || !user || !socket || !isConnected || hasJoinedLobby) {
            return;
        }
        socket.emit('round1:join', { userId, username: user?.user_metadata?.full_name || user?.id }, (response: { success?: boolean; error?: string }) => {
            if (response?.success) {
                showSuccessToast('Successfully joined Round 1 lobby');
            } else {
                showErrorToast(response?.error || 'Failed to join lobby');
            }
        });
        setHasJoinedLobby(true);
    }, [socket, isConnected, authenticationChecked, hasJoinedLobby, userId, user, authLoading]);

    // Socket event listeners
    useEffect(() => {
        if (!socket) return;

        const handleLobbyUpdate = (lobbyData: LobbyData) => {
            setIsLoading(false);
            if (lobbyData.participants) {
                setParticipants(lobbyData.participants);
            }
            if (lobbyData.isActive !== undefined) {
                setIsRoundActive(lobbyData.isActive);
            }
        };

        const handleRoundStarted = (data: RoundStartData) => {
            console.log('Round 1 started! Data received:', data);
            setRoundStarted(true);
            setIsRoundActive(true);
            showSuccessToast('Round 1 has started! Entering matchmaking...');
            
            // Store round data if needed
            if (data && typeof data === 'object') {
                try {
                    const dataToStore = {
                        startTime: data.startTime,
                        duration: (data.duration || 5400) * 1000 // Ensure duration is in ms
                    };
                    sessionStorage.setItem('round1_data', JSON.stringify(dataToStore));
                } catch (error) {
                    console.error("Failed to save round data to sessionStorage:", error);
                }
            }
            
            // Redirect to waiting room after round starts
            setTimeout(() => {
                router.push('/r1/waiting');
            }, 2000); // Give user 2 seconds to see the success message
        };

        const handleMatchFound = (data: MatchFoundData) => {
            console.log('Match found! Data:', data);
            
            // FIX: Store the complete match data, including the new startTime and duration
            if (data) {
                try {
                    sessionStorage.setItem('round1_match_data', JSON.stringify(data));
                } catch (error) {
                    console.error("Failed to save match data:", error);
                }
            }
            
            showSuccessToast('Match found! Redirecting to code room...');
            
            // Immediate redirect to code room since this means a match was found
            setTimeout(() => {
                router.push('/r1/code');
            }, 1500);
        };

        const handleRoundEnd = () => {
            showSuccessToast('Round 1 has ended');
            router.push('/dashboard');
        };

        const handleError = (error: ErrorData) => {
            const errorMessage = typeof error === 'string' ? error : error?.message || 'An error occurred';
            showErrorToast(errorMessage);
        };

        socket.on('lobby:round1', handleLobbyUpdate);
        socket.on('round1:started', handleRoundStarted);
        socket.on('round1:matchFound', handleMatchFound);
        socket.on('round1:ended', handleRoundEnd);
        socket.on('round1:error', handleError);

        return () => {
            socket.off('lobby:round1', handleLobbyUpdate);
            socket.off('round1:started', handleRoundStarted);
            socket.off('round1:matchFound', handleMatchFound);
            socket.off('round1:ended', handleRoundEnd);
            socket.off('round1:error', handleError);
        };
    }, [socket, router]);

    const handleStartRound = () => {
        if (!socket || participants.length === 0) return;
        socket.emit('round1:ready', {}, (response: { success?: boolean; error?: string }) => {
            if (response?.success) {
                showSuccessToast('Round 1 started successfully');
            } else {
                showErrorToast(response?.error || 'Failed to start round');
            }
        });
    };

    const formatTime = (seconds: number) => new Date(seconds * 1000).toISOString().substr(14, 5);

    if (authLoading || !authenticationChecked) {
        return ( <div>Loading Authentication...</div> );
    }

    return (
        <>
        <div className = "flex flex-col bg-[url('/r0_lobby_bg.svg')] bg-center bg-cover h-screen">
            <div className = "flex-shrink-0 orbitron items-center flex flex-col text-7xl" style={{ textShadow: '0 0 10px rgba(217, 119, 6, 1)' }}>
                <p className='flex-1 flex items-end pt-8'> <span className = "text-white">ROUND</span> <span className="text-orange-500">&nbsp; 1</span></p>
                <span className = "text-orange-500 text-2xl pb-4">LOBBY</span>
                
                {(roundStarted || isRoundActive) && (
                    <div className="mt-3 flex flex-col items-center gap-2">
                        {roundStarted ? (
                            <>
                                <div className="text-base text-center text-green-400">Round 1 Started!</div>
                                <div className="text-gray-200 text-center text-sm">
                                    <p>Entering matchmaking queue...</p>
                                    <div className="flex justify-center items-center gap-2 mt-2">
                                        <div className="bg-green-500 rounded-full h-2 w-2 animate-pulse"></div>
                                        <div className="bg-green-500 rounded-full h-2 w-2 animate-pulse" style={{animationDelay: '0.5s'}}></div>
                                        <div className="bg-green-500 rounded-full h-2 w-2 animate-pulse" style={{animationDelay: '1s'}}></div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="text-base text-center text-green-400">Round 1 Active</div>
                                <div className="text-gray-200 text-center text-sm">
                                    <p>Round is currently in progress</p>
                                    <p className="text-orange-400 font-bold mt-1">Time Remaining: {formatTime(timeRemaining)}</p>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
            <div className='flex-shrink-0 text-2xl orbitron ml-40 pb-4'>
                Participants: {participants.length}
            </div>
            <div className = "flex-1 p-6 min-h-0">
                {/* Custom scrollbar container for overflow handling */}
                <CustomScrollbar className="h-full overflow-y-auto">
                    {/* 3-column grid of player cards */}
                    <div className="grid grid-cols-3 gap-12 max-w-6xl mx-auto pb-6">
                        {isLoading ? (
                            Array.from({ length: 10 }).map((_, index) => (
                                <div key={index} className="relative w-full h-[90px] mb-3">
                                    <div className="absolute inset-0 w-full h-full bg-gray-800/50 animate-pulse rounded-lg"></div>
                                </div>
                            ))
                        ) : participants.length > 0 ? (
                            participants.map((participant) => (
                                <PlayerCard 
                                    key={participant.id}
                                    username={participant.username}
                                    avatar={`https://ui-avatars.com/api/?name=${encodeURIComponent(participant.username)}&background=ea580c&color=fff`}
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

                    {isAdmin && !isLoading && participants.length > 0 && (
                        <button
                            onClick={handleStartRound}
                            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-lg shadow-lg hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm flex items-center gap-2"
                            disabled={isLoading}
                        >
                            <Rocket className="h-4 w-4" />
                            Start Round 1
                        </button>
                    )}
                </div>
            )}

        </div>
        
        
        </>

    );
}