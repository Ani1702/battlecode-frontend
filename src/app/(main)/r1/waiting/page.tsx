"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Waiting from '@/components/shared/waiting';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { showSuccessToast, showErrorToast, showInfoToast } from '@/components/shared/CustomToast';

interface R1Participant {
  id: string;
  username: string;
  rank: number;
  status: 'lobby' | 'waiting' | 'in-match' | 'cooldown';
  cooldownStartTime?: number;
  waitingSince?: number;
  joinedAt: string;
}

interface MatchFoundData {
  opponent: { id: string; rank?: number };
  question: { id: string; title: string; };
  startTime: number;
  duration: number;
}

interface RoundTimerData {
  globalTimeRemaining: number;
  roundStartTime: number;
  roundDuration: number;
}

export default function WaitingRoomR1() {
    const router = useRouter();
    const { socket, isConnected } = useSocket();
    const { user, userId, userRole, isLoading: authLoading } = useAuth();
    
    const [round1Participants, setRound1Participants] = useState<R1Participant[]>([]);
    const [isRoundActive, setIsRoundActive] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [hasSeenRoundStart, setHasSeenRoundStart] = useState(false);
    
    // Global timer state
    const [globalTimeRemaining, setGlobalTimeRemaining] = useState<number>(0);
    const [roundStartTime, setRoundStartTime] = useState<number | null>(null);
    const [roundDuration] = useState(90 * 60); // 90 minutes in seconds
    
    // Cooldown state - FIXED: Better state management
    const [isInCooldown, setIsInCooldown] = useState(false);
    const [cooldownTimeRemaining, setCooldownTimeRemaining] = useState<number | null>(null);
    const [cooldownStartTime, setCooldownStartTime] = useState<number | null>(null);
    
    // Matchmaking cycle state
    const [nextMatchmakingCycle, setNextMatchmakingCycle] = useState<number | null>(null);
    const [isFirstCycle, setIsFirstCycle] = useState(true);

    // Check if current user is admin
    const isAdmin = userRole === 'ADMIN';

    // FIXED: Better cooldown calculation with fallback
    const calculateCooldownRemaining = (startTime: number): number => {
        const COOLDOWN_DURATION = 2 * 60 * 1000; // 2 minutes in milliseconds
        const elapsed = Date.now() - startTime;
        return Math.max(0, Math.ceil((COOLDOWN_DURATION - elapsed) / 1000));
    };

    // Auto-redirect effect - handles end of round
    useEffect(() => {
        if (!isRoundActive) return;

        // Only handle auto-redirect when globalTimeRemaining reaches 0
        if (globalTimeRemaining === 0) {
            showInfoToast('Round 1 has ended! Redirecting to dashboard...');
            setTimeout(() => router.push('/dashboard'), 2000);
        }
    }, [globalTimeRemaining, isRoundActive, router]);

    // Initial state fetch and setup - FIXED: Better cooldown handling
    useEffect(() => {
        if (!socket || !isConnected || !userId) return;

        console.log('[GetState] Requesting state from backend...');
        socket.emit('round1:getState', {}, (response: any) => {
            console.log('[GetState] Raw response:', response);
            if (response?.success) {
                console.log('[GetState] Successfully received state:', {
                    participantStatus: response.participant?.status,
                    isActive: response.isActive,
                    participantCount: response.round1Participants?.length,
                    cooldownTimeRemaining: response.cooldownTimeRemaining,
                    userInQueue: response.userInQueue
                });
                
                setIsRoundActive(response.isActive);
                if (response.round1Participants) {
                    setRound1Participants(response.round1Participants);
                }
                
                // Check if user is in a match and should be redirected
                if (response.participant?.status === 'in-match') {
                    showInfoToast('Redirecting to your active match...');
                    router.push('/r1/code');
                    return;
                }
                
                // Set all timer states from backend ONLY
                if (response.isActive) {
                    if (response.roundStartTime) {
                        setRoundStartTime(response.roundStartTime);
                    }
                    if (response.globalTimeRemaining !== undefined) {
                        setGlobalTimeRemaining(response.globalTimeRemaining);
                    }
                }
                
                // BULLETPROOF: Simple cooldown state restoration
                const participant = response.participant;
                
                console.log('[GetState] Participant status:', participant?.status);
                console.log('[GetState] Backend cooldown time:', response.cooldownTimeRemaining);
                
                if (participant?.status === 'cooldown' && response.cooldownTimeRemaining > 0) {
                    // User is in cooldown with valid time remaining
                    console.log('[GetState] ✅ Restoring cooldown:', response.cooldownTimeRemaining, 'seconds');
                    setIsInCooldown(true);
                    setCooldownTimeRemaining(response.cooldownTimeRemaining);
                    if (participant.cooldownStartTime) {
                        setCooldownStartTime(participant.cooldownStartTime);
                    }
                } else {
                    // User is not in cooldown or cooldown expired
                    console.log('[GetState] ✅ Clearing cooldown state');
                    setIsInCooldown(false);
                    setCooldownTimeRemaining(null);
                    setCooldownStartTime(null);
                }
                
                // Set matchmaking cycle from backend
                if (response.nextMatchmakingCycle !== undefined) {
                    setNextMatchmakingCycle(response.nextMatchmakingCycle);
                }
                
                // Set first cycle status
                setIsFirstCycle(response.isFirstCycle !== false);
                
                setIsLoading(false);
            } else {
                showErrorToast(response?.error || "Could not get round state.");
                router.push('/dashboard');
            }
        });

    }, [socket, isConnected, userId, router]);

    // FIXED: Client-side cooldown countdown for smooth UI when backend timer is missing
    useEffect(() => {
        if (!isInCooldown || cooldownTimeRemaining === null || cooldownTimeRemaining <= 0) return;

        const interval = setInterval(() => {
            setCooldownTimeRemaining(prev => {
                if (prev === null || prev <= 1) {
                    // Cooldown finished
                    setIsInCooldown(false);
                    setCooldownTimeRemaining(null);
                    setCooldownStartTime(null);
                    showSuccessToast("You are back in the matchmaking queue!");
                    return null;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isInCooldown, cooldownTimeRemaining]);

    // Socket event listeners - FIXED: Better cooldown timer handling
    useEffect(() => {
        if (!socket) return;

        const handleMatchFound = (data: MatchFoundData) => {
            if (isInCooldown) {
                console.warn('[MatchFound] Ignoring match found during cooldown');
                return;
            }
            showSuccessToast('Match found! Redirecting...');
            sessionStorage.setItem('round1_match_data', JSON.stringify(data));
            router.push('/r1/code');
        };

        const handleGlobalTimer = (data: { timeRemaining: number }) => {
            console.log('[Frontend] Received globalTimer:', data.timeRemaining);
            setGlobalTimeRemaining(data.timeRemaining);
        };

        const handleCooldownTimer = (data: { timeRemaining: number }) => {
            console.log('[Frontend] Received cooldownTimer:', data.timeRemaining);
            // Only update if we're actually in cooldown state
            if (isInCooldown) {
                setCooldownTimeRemaining(data.timeRemaining);
            }
        };

        const handleMatchmakingCycle = (data: { nextCycle: number; isFirstCycle: boolean }) => {
            console.log('[Frontend] Received matchmakingCycle:', data);
            setNextMatchmakingCycle(data.nextCycle);
            setIsFirstCycle(data.isFirstCycle);
        };

        const handleRoundStarted = (data?: RoundTimerData) => {
            console.log('[RoundStarted] Received round start event:', data);
            if (!hasSeenRoundStart) {
                showSuccessToast('Round 1 has started!');
                setIsRoundActive(true);
                setHasSeenRoundStart(true);
                
                // Set round timer from backend data
                if (data?.roundStartTime) {
                    setRoundStartTime(data.roundStartTime);
                }
                setIsFirstCycle(true);
                
                // Force refresh state to get updated participant status
                console.log('[RoundStarted] Requesting updated state after round start...');
                socket?.emit('round1:getState', {}, (response: any) => {
                    if (response?.success) {
                        console.log('[RoundStarted] Updated state received:', response.participant?.status);
                        setRound1Participants(response.round1Participants || []);
                    }
                });
            }
        };
        
        const handleCooldownStart = (data: { duration: number; startTime: number }) => {
            console.log('[CooldownStart] Received cooldown start:', data);
            showInfoToast("Match finished. Entering 2-minute cooldown.");
            setIsInCooldown(true);
            setCooldownStartTime(data.startTime);
            
            // Calculate initial cooldown time
            const initialCooldown = Math.ceil(data.duration / 1000);
            setCooldownTimeRemaining(initialCooldown);
            
            console.log('[CooldownStart] Set cooldown for', initialCooldown, 'seconds');
        };

        const handleCooldownEnd = () => {
            console.log('[CooldownEnd] Received cooldown end signal');
            showSuccessToast("You are back in the matchmaking queue!");
            setIsInCooldown(false);
            setCooldownTimeRemaining(null);
            setCooldownStartTime(null);
        };

        const handleRoundEnd = () => {
            showInfoToast('Round 1 has ended.');
            router.push('/dashboard');
        };

        const handleParticipantsUpdate = (data: { participants: R1Participant[] }) => {
            console.log('[ParticipantsUpdate] Received participants update:', data.participants?.length, 'participants');
            setRound1Participants(data.participants || []);
            
            // Check if current user's status has changed
            const currentUser = data.participants?.find(p => p.id === userId);
            if (currentUser) {
                console.log('[ParticipantsUpdate] Current user status:', currentUser.status);
                
                // Update cooldown state if user status changed
                if (currentUser.status === 'cooldown' && !isInCooldown) {
                    console.log('[ParticipantsUpdate] User entered cooldown, updating state');
                    setIsInCooldown(true);
                    if (currentUser.cooldownStartTime) {
                        const remaining = calculateCooldownRemaining(currentUser.cooldownStartTime);
                        setCooldownTimeRemaining(remaining);
                        setCooldownStartTime(currentUser.cooldownStartTime);
                    }
                } else if (currentUser.status !== 'cooldown' && isInCooldown) {
                    console.log('[ParticipantsUpdate] User left cooldown, clearing state');
                    setIsInCooldown(false);
                    setCooldownTimeRemaining(null);
                    setCooldownStartTime(null);
                }
            }
        };

        const handleFirstCycleComplete = () => {
            setIsFirstCycle(false);
        };

        socket.on('round1:matchFound', handleMatchFound);
        socket.on('round1:started', handleRoundStarted);
        socket.on('round1:cooldown', handleCooldownStart);
        socket.on('round1:cooldownEnd', handleCooldownEnd);
        socket.on('round1:ended', handleRoundEnd);
        socket.on('round1:participantsUpdate', handleParticipantsUpdate);
        socket.on('round1:firstCycleComplete', handleFirstCycleComplete);
        socket.on('round1:globalTimer', handleGlobalTimer);
        socket.on('round1:cooldownTimer', handleCooldownTimer);
        socket.on('round1:matchmakingCycle', handleMatchmakingCycle);

        return () => {
            socket.off('round1:matchFound', handleMatchFound);
            socket.off('round1:started', handleRoundStarted);
            socket.off('round1:cooldown', handleCooldownStart);
            socket.off('round1:cooldownEnd', handleCooldownEnd);
            socket.off('round1:ended', handleRoundEnd);
            socket.off('round1:participantsUpdate', handleParticipantsUpdate);
            socket.off('round1:firstCycleComplete', handleFirstCycleComplete);
            socket.off('round1:globalTimer', handleGlobalTimer);
            socket.off('round1:cooldownTimer', handleCooldownTimer);
            socket.off('round1:matchmakingCycle', handleMatchmakingCycle);
        };
    }, [socket, router, isInCooldown, hasSeenRoundStart, roundDuration]);

    // Start round function for admin
    const handleStartRound = () => {
        if (!isAdmin || !socket) {
            console.error('[StartRound] Cannot start round - not admin or no socket connection');
            showErrorToast('Cannot start round - insufficient permissions or no connection');
            return;
        }
        
        console.log('[StartRound] Admin starting round 1...');
        socket.emit('round1:ready', {}, (response: any) => {
            console.log('[StartRound] Response:', response);
            if (response?.success) {
                showSuccessToast('Round 1 started successfully!');
            } else {
                console.error('[StartRound] Failed:', response?.error);
                showErrorToast(response?.error || 'Failed to start round');
            }
        });
    };

    if (authLoading || isLoading) {
        return <div className="flex items-center justify-center h-screen bg-black text-white">Loading...</div>;
    }

    // Convert R1Participant to the format expected by the Waiting component
    const waitingComponentParticipants = round1Participants.map(p => ({
        userId: p.id,
        username: p.username,
        status: p.status.toUpperCase() as 'WAITING' | 'IN_MATCH' | 'DISCONNECTED' | 'FINISHED' | 'LOBBY' | 'COOLDOWN',
        joinedAt: p.joinedAt || new Date().toISOString(),
        isReady: true,
        rank: p.rank,
        cooldownStartTime: p.cooldownStartTime,
        waitingSince: p.waitingSince,
        rawStatus: p.status
    }));

    return (
        <Waiting
            round="1"
            participants={waitingComponentParticipants}
            isRoundActive={isRoundActive}
            timeRemaining={globalTimeRemaining}
            roundDuration={roundDuration}
            totalParticipants={round1Participants.length}
            isLoading={isLoading}
            roundStarted={isRoundActive}
            isInCooldown={isInCooldown}
            cooldownTimeRemaining={cooldownTimeRemaining}
            onStartRound={isAdmin ? handleStartRound : undefined}
            nextMatchmakingCycle={nextMatchmakingCycle}
            isFirstCycle={isFirstCycle}
            isAdmin={isAdmin}
        />
    );
}