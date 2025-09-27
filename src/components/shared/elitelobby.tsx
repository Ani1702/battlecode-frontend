"use client";
import { useState, useEffect, useCallback, memo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/contexts/SocketContext';
import { showSuccessToast, showErrorToast, showInfoToast } from '@/components/shared/CustomToast';
import CustomScrollbar from '@/components/shared/CustomScrollbar';
import IncomingEliteCard from '@/components/shared/IncomingEliteCard';
import BountyQuestionCard, { BountyQuestion } from '@/components/shared/BountyQuestionCard';

// --- Interfaces ---
interface Participant {
  id: string;
  username: string;
  status: string;
  role?: 'elite' | 'challenger';
  expiresAt?: number;
}

interface SimpleSocketResponse {
    success: boolean;
    message?: string;
}

interface SocketStateResponse {
    success: boolean;
    state: {
        userRole?: 'challenger' | 'elite' | null;
        activeSession?: { type: 'match' | 'bounty', contextId: string } | null;
    };
}

interface ServerBountyQuestion extends Omit<BountyQuestion, 'name'> {
    title: string;
    isSolvedByAnyone?: boolean;
    isAttemptedByUser?: boolean;
}

interface EliteDashboardResponse {
    success: boolean;
    message?: string;
    dashboard: {
        roundEndTime: number;
        bountyQuestions: ServerBountyQuestion[];
        incomingRequests: Participant[];
    };
}

const formatTime = (ms: number) => {
    if (ms <= 0) return "00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
};

const RequestTimer = memo(({ expiresAt, onExpire }: { expiresAt: number | undefined, onExpire: () => void }) => {
    const calculateTimeLeft = useCallback(() => {
        if (!expiresAt) return 0;
        return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
    }, [expiresAt]);

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);

    useEffect(() => {
        if (!expiresAt) return;

        if (calculateTimeLeft() <= 0) {
            onExpire();
            return;
        }

        const intervalId = setInterval(() => {
            const remaining = calculateTimeLeft();
            setTimeLeft(remaining);
            if (remaining <= 0) {
                clearInterval(intervalId);
                onExpire();
            }
        }, 1000);

        return () => clearInterval(intervalId);
    }, [expiresAt, onExpire, calculateTimeLeft]);

    if (timeLeft <= 0) {
        return <span className="text-sm text-red-500 font-mono">Expired</span>;
    }

    return <span className="text-sm text-yellow-400 relative right-[248px] top-[20px] font-mono">Expires in {timeLeft}s</span>;
});
RequestTimer.displayName = 'RequestTimer';

const ChallengerRequestRow = memo(({ player, onAccept, onDeny, onRemove }: {
    player: Participant;
    onAccept: (id: string) => void;
    onDeny: (id: string) => void;
    onRemove: (id: string) => void;
}) => {
    const handleExpire = useCallback(() => {
        onRemove(player.id);
    }, [player.id, onRemove]);

    return (
        <div className="relative mb-2">
            <IncomingEliteCard
                username={player.username}
                onAccept={() => onAccept(player.id)}
                onDeny={() => onDeny(player.id)}
            />
            <div className="absolute top-1/2 right-4 -translate-y-1/2 pointer-events-none">
                <RequestTimer
                    expiresAt={player.expiresAt}
                    onExpire={handleExpire}
                />
            </div>
        </div>
    );
});
ChallengerRequestRow.displayName = 'ChallengerRequestRow';


export default function EliteDashboard() {
  const router = useRouter();
  const { socket, isConnected } = useSocket();

  const [incomingChallengers, setIncomingChallengers] = useState<Participant[]>([]);
  const [bountyQuestions, setBountyQuestions] = useState<BountyQuestion[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [roundEndTime, setRoundEndTime] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false); // Safeguard state

  const handleRemoveChallenger = useCallback((challengerId: string) => {
      setIncomingChallengers(prev => prev.filter(p => p.id !== challengerId));
  }, []);

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('round2:getState', (stateResponse: SocketStateResponse) => {
        if (!stateResponse.success) {
            showErrorToast("Could not verify state. Redirecting...");
            router.push('/dashboard');
            return;
        }

        if (stateResponse.state.activeSession) {
            showInfoToast("Resuming your active session...");
            try {
                sessionStorage.setItem('r2_session_type', stateResponse.state.activeSession.type);
                sessionStorage.setItem('r2_context_id', stateResponse.state.activeSession.contextId);
                sessionStorage.setItem('r2_user_role', 'elite');
                router.push(`/r2/code`);
            } catch (error) {
              console.log(error);
                showErrorToast("Could not resume session. Please enable storage.");
            }
            return;
        }

        if (stateResponse.state.userRole === 'elite') {
            socket.emit('round2:getDashboardState', (dashResponse: EliteDashboardResponse) => {
                if (dashResponse.success) {
                    setRoundEndTime(dashResponse.dashboard.roundEndTime);
                    const transformedBounties = dashResponse.dashboard.bountyQuestions.map((q) => ({
                        ...q, name: q.title,
                    }));
                    setBountyQuestions(transformedBounties);
                    setIncomingChallengers(dashResponse.dashboard.incomingRequests);
                } else {
                    showErrorToast(dashResponse.message || "Failed to load dashboard.");
                    router.push('/dashboard');
                }
                setIsLoading(false);
            });
        } else {
            showErrorToast("Access denied. Redirecting...");
            router.push(stateResponse.state.userRole ? `/r2/${stateResponse.state.userRole}` : '/dashboard');
        }
    });
  }, [socket, isConnected, router]);

  // --- MODIFIED: Timer now triggers redirection ---
  useEffect(() => {
    if (!roundEndTime || isRedirecting) return;
    const interval = setInterval(() => {
        const remaining = roundEndTime - Date.now();
        setTimeRemaining(Math.max(0, remaining));
        if (remaining <= 0) {
            clearInterval(interval);
            // --- FIX: Redirect when timer hits zero ---
            if (!isRedirecting) {
                setIsRedirecting(true);
                showInfoToast("Round 2 has ended. You will be redirected to the dashboard.");
                setTimeout(() => {
                    router.push('/dashboard');
                }, 3000);
            }
        }
    }, 1000);
    return () => clearInterval(interval);
  }, [roundEndTime, router, isRedirecting]);

  useEffect(() => {
    if (!socket) return;

    const handleChallengeIncoming = (data: { challenger: Participant }) => {
      showInfoToast(`${data.challenger.username} has challenged you!`);
      setIncomingChallengers(prev => [...prev.filter(c => c.id !== data.challenger.id), data.challenger]);
    };

    const handleMatchStarted = (data: { matchId: string }) => {
        showSuccessToast("Match starting! Redirecting...");
        try {
            sessionStorage.setItem('r2_session_type', 'match');
            sessionStorage.setItem('r2_context_id', data.matchId);
            sessionStorage.setItem('r2_user_role', 'elite');
            router.push(`/r2/code`);
        } catch (error) {
            console.error("Session storage is unavailable.", error);
            showErrorToast("Could not save session. Please enable cookies/storage.");
        }
    };
    
    const handleRequestExpired = (data: { challengerId: string }) => {
        handleRemoveChallenger(data.challengerId);
    };

    const handleDashboardUpdate = (data: { incomingRequests?: Participant[] }) => {
        if (data.incomingRequests) {
            setIncomingChallengers(data.incomingRequests);
        }
    };
    
    const handleRoundEnd = () => {
        // --- FIX: Use safeguard to prevent double redirection ---
        if (isRedirecting) return;
        setIsRedirecting(true);
        showInfoToast("Round 2 has ended. You will be redirected to the dashboard.");
        setTimeout(() => {
            router.push('/dashboard');
        }, 3000);
    };

    socket.on('round2:challengeIncoming', handleChallengeIncoming);
    socket.on('round2:matchStarted', handleMatchStarted);
    socket.on('round2:requestExpired', handleRequestExpired);
    socket.on('round2:dashboardUpdate', handleDashboardUpdate);
    socket.on('round2:ended', handleRoundEnd);

    return () => {
      socket.off('round2:challengeIncoming', handleChallengeIncoming);
      socket.off('round2:matchStarted', handleMatchStarted);
      socket.off('round2:requestExpired', handleRequestExpired);
      socket.off('round2:dashboardUpdate', handleDashboardUpdate);
      socket.off('round2:ended', handleRoundEnd);
    };
  }, [socket, router, handleRemoveChallenger, isRedirecting]);
  
  const handleStartBounty = (questionId: string) => {
    if (!socket) return;
    socket.emit('round2:bountyBeginQuestion', { questionId }, (response: SimpleSocketResponse) => {
        if (response.success) {
            showSuccessToast("Starting bounty... good luck!");
            try {
                sessionStorage.setItem('r2_session_type', 'bounty');
                sessionStorage.setItem('r2_context_id', questionId);
                sessionStorage.setItem('r2_user_role', 'elite');
                router.push(`/r2/code`);
            } catch (error) {
                console.error("Session storage is unavailable.", error);
                showErrorToast("Could not save session. Please enable cookies/storage.");
            }
        } else {
            showErrorToast(response.message || "Could not start bounty.");
        }
    });
  };

  const handleAcceptChallenge = useCallback((challengerId: string) => {
    if (!socket) return;
    socket.emit('round2:challengeAccept', { challengerId }, (response: SimpleSocketResponse) => {
        if (!response.success) {
            showErrorToast(response.message || "Failed to accept challenge.");
            if (response.message?.includes("active session")) {
                router.refresh();
            }
        }
    });
  }, [socket, router]);

  const handleDenyChallenge = useCallback((challengerId: string) => {
    if (!socket) return;
    socket.emit('round2:challengeReject', { challengerId }, (response: SimpleSocketResponse) => {
        if (response.success) {
            showSuccessToast("Challenge rejected.");
            handleRemoveChallenger(challengerId);
        } else {
            showErrorToast(response.message || "Failed to reject challenge.");
        }
    });
  }, [socket, handleRemoveChallenger]);
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen text-white bg-gray-900">Checking session status...</div>;
  }

  return (
    <div className="flex bg-[url('/elite_bg.svg')] bg-center bg-no-repeat h-screen w-full flex-col overflow-hidden orbitron">
        <div className="flex-1 flex items-center justify-center text-6xl orbitron white-glow relative">
            <Image src="/b-2.svg" alt="Battlecode Logo" className="h-20" width={80} height={80}/>
            ELITE DASHBOARD
            <div className="absolute top-4 right-4 bg-black/50 text-white text-2xl p-2 px-4 rounded-lg font-mono">
                {formatTime(timeRemaining)}
            </div>
        </div>
        <div className="flex-4 flex flex-row">
          <div className="flex-1">
            <div className="h-[80%] w-[80%] glass-box rounded-lg m-auto mt-10 p-5">
              <h2 className="text-2xl font-bold text-white mb-4 orbitron">Incoming Challengers</h2>
              <CustomScrollbar className="h-[calc(100%-3rem)] overflow-y-auto overflow-x-hidden pr-2">
                {incomingChallengers.length > 0 ? (
                  incomingChallengers.map((player) => (
                    <ChallengerRequestRow
                        key={player.id}
                        player={player}
                        onAccept={handleAcceptChallenge}
                        onDeny={handleDenyChallenge}
                        onRemove={handleRemoveChallenger}
                    />
                  ))
                ) : (
                  <div className="text-center text-gray-400 mt-8">
                    <p className="text-lg">No incoming challenges</p>
                    <p className="text-sm">Waiting for challengers...</p>
                  </div>
                )}
              </CustomScrollbar>
            </div>
          </div>
          <div className="flex-1">
            <div className="h-[80%] w-[80%] glass-box rounded-lg m-auto mt-10 p-5">
              <h2 className="text-2xl font-bold text-white mb-4 orbitron">Bounty Questions</h2>
              <CustomScrollbar className="h-[calc(100%-3rem)] overflow-y-auto pr-2">
                {bountyQuestions.map((question) => (
                    <BountyQuestionCard
                      key={question.id}
                      question={question}
                      onSolve={() => handleStartBounty(question.id)}
                    />
                  ))}
              </CustomScrollbar>
            </div>
          </div>
        </div>
      </div>
  );
}