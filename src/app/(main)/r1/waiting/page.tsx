"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Waiting from '@/components/shared/waiting';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { showSuccessToast, showErrorToast } from '@/components/shared/CustomToast';

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

interface GlobalJoinResponse {
  success: boolean;
  leaderboard?: Array<{
    id: string;
    username: string;
    score: number;
    rank: number;
  }>;
}

interface Round1StateResponse {
  success: boolean;
  isActive: boolean;
  globalTimeRemaining?: number;
  participant?: {
    id: string;
    username: string;
    status: string;
    joinedAt: string;
  };
}

interface Round1JoinResponse {
  success: boolean;
  error?: string;
}

interface MatchFoundData {
  opponent: { id: string; rank?: number };
  question: {
    id: string;
    title: string;
    description: string;
    difficulty: string;
    duration?: number;
    constraints?: string[];
    boilerplate?: { [key: string]: string };
    sampleTestCases?: Array<{
      stdin?: string;
      expected_output?: string;
      input?: { stdin?: string; json?: unknown };
      output?: { stdout?: string; json?: unknown };
      explanation?: string;
    }>;
    hints?: string[];
  };
  startTime: number;
  duration: number;
  difficulty?: string;
}

export default function Waiting_room(){
    const router = useRouter();
    const { socket, isConnected } = useSocket();
    const { user, userId, isLoading: authLoading } = useAuth();
    
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [allUsers, setAllUsers] = useState<Array<{ id: string; username: string; score: number; rank: number }>>([]);
    const [isRoundActive, setIsRoundActive] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [roundDuration] = useState(5400); // 90 minutes
    const [isLoading, setIsLoading] = useState(true);
    const [hasJoinedLobby, setHasJoinedLobby] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [showCountdown, setShowCountdown] = useState(false);

    useEffect(() => {
        if (!socket || !isConnected || !userId) return;

        socket.emit('global:join', {}, (response: GlobalJoinResponse) => {
            if (response?.success && response.leaderboard) {
                setAllUsers(response.leaderboard);
            }
        });

        socket.emit('round1:getState', {}, (response: Round1StateResponse) => {
            if (response?.success) {
                setIsRoundActive(response.isActive);
                setTimeRemaining(response.globalTimeRemaining || 0);
                if (response.participant) {
                    const participantData: Participant = {
                        userId: response.participant.id,
                        username: response.participant.username,
                        status: (response.participant.status?.toUpperCase() as Participant['status']) || 'WAITING',
                        joinedAt: response.participant.joinedAt || new Date().toISOString(),
                        isReady: true
                    };
                    setParticipants([participantData]);
                    
                    if (response.participant.status) {
                        setHasJoinedLobby(true);
                    }
                }
                setIsLoading(false);
            }
        });
    }, [socket, isConnected, userId]);

    useEffect(() => {
        if (!socket || !isConnected || !userId || !user || hasJoinedLobby || authLoading || isLoading) return;

        socket.emit('round1:join', { userId, username: user?.user_metadata?.full_name || user?.id }, (response: Round1JoinResponse) => {
            if (response?.success) {
                showSuccessToast('Joined Round 1 matchmaking queue');
                setHasJoinedLobby(true);
            } else {
                showErrorToast(response?.error || 'Failed to join queue');
            }
        });
    }, [socket, isConnected, userId, user, hasJoinedLobby, authLoading, isLoading]);

    useEffect(() => {
        if (isRoundActive || hasJoinedLobby) {
            setShowCountdown(true);
            setCountdown(10);
        }
    }, [isRoundActive, hasJoinedLobby]);

    useEffect(() => {
        if (showCountdown && countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (showCountdown && countdown === 0) {
            setShowCountdown(false);
            showSuccessToast('Entering matchmaking queue...');
        }
    }, [showCountdown, countdown]);

    useEffect(() => {
        if (!socket) return;

        const handleMatchFound = (data: MatchFoundData) => {
            showSuccessToast('Match found! Redirecting to code room...');
            
            try {
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('round1_match_state_')) {
                        localStorage.removeItem(key);
                    }
                });
                console.log("Cleared previous Round 1 match states from localStorage.");
            } catch (error) {
                console.error("Failed to clear previous match states:", error);
            }

            if (data) {
                try {
                    sessionStorage.setItem('round1_match_data', JSON.stringify(data));
                } catch (error) {
                    console.error("Failed to save match data:", error);
                }
            }
            
            router.push('/r1/code');
        };

        const handleRoundEnd = () => {
            showSuccessToast('Round 1 has ended');
            router.push('/dashboard');
        };

        const handleCooldown = () => {
            showSuccessToast('Match completed! Entering cooldown period...');
        };

        const handleError = (error: { message?: string } | string) => {
            const errorMessage = typeof error === 'string' ? error : error?.message || 'An error occurred';
            showErrorToast(errorMessage);
        };

        socket.on('round1:matchFound', handleMatchFound);
        socket.on('round1:ended', handleRoundEnd);
        socket.on('round1:cooldown', handleCooldown);
        socket.on('round1:error', handleError);

        return () => {
            socket.off('round1:matchFound', handleMatchFound);
            socket.off('round1:ended', handleRoundEnd);
            socket.off('round1:cooldown', handleCooldown);
            socket.off('round1:error', handleError);
        };
    }, [socket, router]);

    useEffect(() => {
        if (!isRoundActive || timeRemaining <= 0) return;

        const timer = setInterval(() => {
            setTimeRemaining(prev => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(timer);
    }, [isRoundActive, timeRemaining]);

    if (authLoading) {
        return <div className="flex items-center justify-center h-screen bg-black text-white">Loading...</div>;
    }

    return (
        <>
            <Waiting
                round="1"
                participants={allUsers.length > 0 ? allUsers.map(user => ({
                    userId: user.id,
                    username: user.username,
                    status: user.id === userId ? 'WAITING' : 'DISCONNECTED',
                    joinedAt: new Date().toISOString(),
                    isReady: true
                })) : participants}
                isRoundActive={isRoundActive}
                timeRemaining={timeRemaining}
                roundDuration={roundDuration}
                totalParticipants={allUsers.length || participants.length}
                isLoading={isLoading}
                roundStarted={showCountdown ? false : isRoundActive}
                onStartRound={undefined}
                onJoinRound={undefined}
            />
            
            {showCountdown && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="bg-gray-800 p-12 rounded-lg border border-amber-600 text-center">
                        <h2 className="text-4xl font-bold text-amber-400 mb-6">Round 1 Starting</h2>
                        <div className="text-6xl font-bold text-white mb-4">{countdown}</div>
                        <p className="text-gray-300">Preparing matchmaking system...</p>
                        <div className="flex justify-center items-center gap-2 mt-4">
                            <div className="bg-amber-500 rounded-full h-3 w-3 animate-pulse"></div>
                            <div className="bg-amber-500 rounded-full h-3 w-3 animate-pulse" style={{animationDelay: '0.5s'}}></div>
                            <div className="bg-amber-500 rounded-full h-3 w-3 animate-pulse" style={{animationDelay: '1s'}}></div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}