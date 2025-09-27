"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Rocket } from "lucide-react";
import PlayerCard from '@/components/shared/PlayerCard';
import CustomScrollbar from '@/components/shared/CustomScrollbar';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { showSuccessToast, showErrorToast, showInfoToast } from '@/components/shared/CustomToast';

// --- Interfaces ---

/** Represents a participant in the Round 2 lobby. */
interface R2Participant {
  id: string;
  username: string;
  status: 'lobby' | 'elite:idle' | 'challenger:idle' | 'in-match';
  role?: 'elite' | 'challenger';
}

/** Data structure for the 'round2:lobbyUpdate' socket event. */
interface LobbyUpdateData {
  participants: R2Participant[];
  isRoundActive: boolean;
}

/** A generic successful/failed response from a socket emission. */
interface SimpleSocketResponse {
    success: boolean;
    message?: string;
}

/** Data for the 'round2:rolesAssigned' event. */
interface RoleAssignedData {
    role: 'elite' | 'challenger';
}

/** Data for a generic 'round2:error' event. */
interface SocketErrorData {
    message: string;
}

/** The state object received from the 'round2:getState' emission. */
interface Round2State {
  roundIsActive: boolean;
  shouldBeInGame: boolean;
  userRole: 'elite' | 'challenger' | null;
}

/** The full response from the 'round2:getState' emission. */
interface Round2StateResponse {
  success: boolean;
  message?: string;
  state?: Round2State;
}


// --- Component ---

export default function LobbyR2() {
    const router = useRouter();
    const { socket, isConnected } = useSocket();
    const { userId, userRole, isLoading: authLoading } = useAuth();
    
    const [lobbyParticipants, setLobbyParticipants] = useState<R2Participant[]>([]);
    const [isRoundActive, setIsRoundActive] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [hasAttemptedJoin, setHasAttemptedJoin] = useState(false);

    const isAdmin = useMemo(() => userRole === 'ADMIN', [userRole]);

    // Effect 1: Auth Guard
    // Redirects unauthenticated users after auth status is confirmed.
    useEffect(() => {
        if (!authLoading && !userId) {
            router.push('/dashboard');
        }
    }, [authLoading, userId, router]);

    // Effect 2: Initial State Sync & Lobby Join
    // Runs once to sync with the server state and join the lobby if appropriate.
    useEffect(() => {
        if (!socket || !isConnected || authLoading || !userId || hasAttemptedJoin) {
            return;
        }
    
        setHasAttemptedJoin(true); 
    
        // First, get the server state to see if we should even be on this page.
        socket.emit('round2:getState', (response: Round2StateResponse) => {
            if (response.success && response.state) {
                setIsRoundActive(response.state.roundIsActive);
                
                // If user is already in a match, redirect them immediately.
                if (response.state.shouldBeInGame) {
                    if (response.state.userRole) {
                        showInfoToast("Rejoining your session...");
                        router.push(`/r2/${response.state.userRole}`);
                    } else {
                        // Defensive check: Should have a role but doesn't.
                        showErrorToast("Session is invalid. Redirecting to dashboard.");
                        router.push('/dashboard');
                    }
                    return;
                }

                // If the round is active but the user has no role, they can't join.
                if (response.state.roundIsActive) {
                    showErrorToast("Round 2 is already in progress.");
                    router.push('/dashboard');
                    return;
                }

                // If all checks pass, attempt to join the lobby.
                socket.emit('round2:join', (joinResponse: SimpleSocketResponse) => {
                    if (joinResponse.success) {
                        showSuccessToast('Joined Round 2 Lobby!');
                    } else {
                        showErrorToast(joinResponse.message || 'Failed to join lobby.');
                        router.push('/dashboard');
                    }
                    setIsLoading(false);
                });
            } else {
                showErrorToast(response.message || 'Failed to sync with server.');
                router.push('/dashboard');
                setIsLoading(false);
            }
        });
    }, [socket, isConnected, authLoading, userId, hasAttemptedJoin, router]);

    // Effect 3: Main Socket Event Listeners
    // Sets up and tears down listeners for real-time lobby updates.
    useEffect(() => {
        if (!socket) return;

        const handleLobbyUpdate = (data: LobbyUpdateData) => {
            setLobbyParticipants(data.participants.filter(p => p.status === 'lobby'));
            setIsRoundActive(data.isRoundActive);
            setIsLoading(false);
        };
        
        const handleRoleAssigned = (data: RoleAssignedData) => {
            if (data.role) {
                showInfoToast(`You have been assigned the role of: ${data.role.toUpperCase()}!`);
                setTimeout(() => {
                    router.push(`/r2/${data.role}`);
                }, 2000);
            }
        };

        const handleError = (error: SocketErrorData) => {
            showErrorToast(error.message || "An unknown server error occurred.");
        };

        socket.on('round2:lobbyUpdate', handleLobbyUpdate);
        socket.on('round2:rolesAssigned', handleRoleAssigned);
        socket.on('round2:error', handleError);

        return () => {
            socket.off('round2:lobbyUpdate', handleLobbyUpdate);
            socket.off('round2:rolesAssigned', handleRoleAssigned);
            socket.off('round2:error', handleError);
        };
    }, [socket, router]);

    const handleStartRound = () => {
        if (isAdmin && socket) {
            socket.emit('round2:start', (response: SimpleSocketResponse) => {
                if (response.success) {
            localStorage.removeItem('battlecode-round-2-code-store');

                    showSuccessToast('Round 2 is starting!');
                } else {
                    showErrorToast(response.message || 'Failed to start round.');
                }
            });
        }
    };

    if (authLoading || isLoading) {
        return <div className="flex items-center justify-center h-screen text-white bg-gray-900">Syncing with server...</div>;
    }

    return (
        <div className="flex flex-col bg-[url('/r0_lobby_bg.svg')] bg-center bg-cover h-screen">
            {/* Header */}
            <header className="flex-shrink-0 orbitron items-center flex flex-col text-7xl" style={{ textShadow: '0 0 10px rgba(8, 145, 178, 1)' }}>
                <h1 className='flex-1 flex items-end pt-8'>
                    <span className="text-white">ROUND</span>
                    <span className="text-cyan-400">&nbsp; 2</span>
                </h1>
                <h2 className="text-cyan-400 text-2xl pb-4">LOBBY</h2>
                
                {isRoundActive && (
                    <div className="mt-3 flex flex-col items-center gap-2">
                        <div className="text-base text-center text-green-400 animate-pulse">Round 2 is Active!</div>
                        <p className="text-gray-200 text-center text-sm">Assigning roles to participants...</p>
                    </div>
                )}
            </header>

            {/* Participants Count */}
            <div className='flex-shrink-0 text-2xl orbitron ml-40 pb-4 text-white'>
                Participants: {lobbyParticipants.length}
            </div>

            {/* Participants Grid */}
            <main className="flex-1 p-6 min-h-0">
                <CustomScrollbar className="h-full overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-12 max-w-6xl mx-auto pb-6">
                         {lobbyParticipants.length > 0 ? (
                            lobbyParticipants.map((p) => (
                                <PlayerCard 
                                    key={p.id}
                                    username={p.username}
                                    avatar={`https://ui-avatars.com/api/?name=${encodeURIComponent(p.username)}&background=0e7490&color=fff`}
                                />
                            ))
                        ) : (
                            <div className="col-span-full flex items-center justify-center text-gray-400 text-base py-12">
                                {isRoundActive ? 'Starting round...' : 'Waiting for players to join...'}
                            </div>
                        )}
                    </div>
                </CustomScrollbar>
            </main>

            {/* Footer and Admin Controls */}
            {!isRoundActive && (
                <footer className="flex-shrink-0 p-4 flex flex-col items-center gap-3">
                    <div className="text-sm text-gray-200 text-center">
                        {!isConnected ? (
                             <p className="text-red-400">Connecting to server...</p>
                        ) : (
                             <p className="text-green-400">Connected. Waiting for admin to start the round.</p>
                        )}
                    </div>
                    {isAdmin && (
                        <button
                            onClick={handleStartRound}
                            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-sky-600 text-white font-bold rounded-lg shadow-lg hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={lobbyParticipants.length < 2 || !isConnected}
                        >
                            <Rocket className="h-4 w-4" />
                            Start Round 2
                        </button>
                    )}
                </footer>
            )}
        </div>
    );
}