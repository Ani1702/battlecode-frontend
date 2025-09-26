"use client";
import { useState, useEffect } from 'react';
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
}

interface SimpleSocketResponse {
    success: boolean;
    message?: string;
}

interface SocketStateResponse {
    success: boolean;
    state: {
        userRole?: 'challenger' | 'elite' | null;
    };
}

interface ServerBountyQuestion extends Omit<BountyQuestion, 'name'> {
    title: string;
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

export default function EliteDashboard() {
  const router = useRouter();
  const { socket, isConnected } = useSocket();

  const [incomingChallengers, setIncomingChallengers] = useState<Participant[]>([]);
  const [bountyQuestions, setBountyQuestions] = useState<BountyQuestion[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [roundEndTime, setRoundEndTime] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Role verification and initial data fetch
  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('round2:getState', (stateResponse: SocketStateResponse) => {
        if (stateResponse.success && stateResponse.state.userRole === 'elite') {
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

  // Local countdown timer effect
  useEffect(() => {
    if (!roundEndTime) return;

    setTimeRemaining(Math.max(0, roundEndTime - Date.now()));

    const interval = setInterval(() => {
        const remaining = Math.max(0, roundEndTime - Date.now());
        setTimeRemaining(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [roundEndTime]);


  // Listen for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleChallengeIncoming = (data: { challenger: Participant }) => {
      showInfoToast(`${data.challenger.username} has challenged you!`);
      setIncomingChallengers(prev => [...prev, data.challenger]);
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

    socket.on('round2:challengeIncoming', handleChallengeIncoming);
    socket.on('round2:matchStarted', handleMatchStarted);

    return () => {
      socket.off('round2:challengeIncoming', handleChallengeIncoming);
      socket.off('round2:matchStarted', handleMatchStarted);
    };
  }, [socket, router]);
  
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

  const handleAcceptChallenge = (challengerId: string) => {
    if (!socket) return;
    socket.emit('round2:challengeAccept', { challengerId }, (response: SimpleSocketResponse) => {
        if (!response.success) {
            showErrorToast(response.message || "Failed to accept challenge.");
        }
        // No need to remove the challenger here; wait for the matchStarted event
    });
  };

  const handleDenyChallenge = (challengerId: string) => {
    if (!socket) return;
    socket.emit('round2:challengeReject', { challengerId }, (response: SimpleSocketResponse) => {
        if (response.success) {
            showSuccessToast("Challenge rejected.");
            setIncomingChallengers(prev => prev.filter(p => p.id !== challengerId));
        } else {
            showErrorToast(response.message || "Failed to reject challenge.");
        }
    });
  };
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen text-white bg-gray-900">Loading Elite Dashboard...</div>;
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
        <div className="flex-[4] flex flex-row">
          <div className="flex-1">
            <div className="h-[80%] w-[80%] glass-box rounded-lg m-auto mt-10 p-5">
              <h2 className="text-2xl font-bold text-white mb-4 orbitron">Incoming Challengers</h2>
              <CustomScrollbar className="h-[calc(100%-3rem)] overflow-y-auto overflow-x-hidden pr-2">
                {incomingChallengers.length > 0 ? (
                  incomingChallengers.map((player) => (
                    <IncomingEliteCard
                      key={player.id}
                      username={player.username}
                      onAccept={() => handleAcceptChallenge(player.id)}
                      onDeny={() => handleDenyChallenge(player.id)}
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
                      onSolve={handleStartBounty}
                    />
                  ))}
              </CustomScrollbar>
            </div>
          </div>
        </div>
      </div>
  );
}