"use client"
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/contexts/SocketContext";
import { useAuth } from "@/contexts/AuthContext";
import LobbyPage from "@/components/shared/waiting";
import { showSuccessToast, showErrorToast, showInfoToast } from "@/components/shared/CustomToast";
import Waiting from "../../../../components/shared/waiting";

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

interface Round0Status {
  isActive: boolean;
  participants: Participant[];
  totalParticipants: number;
  timeRemaining: number;
  duration: number;
}

export default function R0Lobby() {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const { user, userRole } = useAuth();
  
  // Round 0 state
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isRoundActive, setIsRoundActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [roundDuration, setRoundDuration] = useState(1200); // 20 minutes
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [roundStarted, setRoundStarted] = useState(false);
  const [currentProblems, setCurrentProblems] = useState<any[]>([]);
  
  // Check if current user is admin
  const isAdmin = userRole === 'ADMIN';

  // Socket event handlers
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for lobby updates
    const handleLobbyUpdate = (data: Round0Status) => {
      console.log('Round 0 lobby update received:', data);
      setParticipants(data.participants || []);
      setTotalParticipants(data.totalParticipants || 0);
      setIsRoundActive(data.isActive || false);
      setTimeRemaining(data.timeRemaining || 0);
      if (data.duration) setRoundDuration(data.duration);
    };

    // Listen for round start
    const handleRoundStart = (data: any) => {
      console.log('Round 0 started:', data);
      setRoundStarted(true);
      setIsRoundActive(true);
      setCurrentProblems(data.problems || []);
      setTimeRemaining(data.duration || 1200);
      showSuccessToast(data.message || 'Round 0 has started!');
      
      // Navigate to code page after a short delay
      setTimeout(() => {
        router.push('/r0/code');
      }, 2000);
    };

    // Listen for timer updates
    const handleTimerUpdate = (data: any) => {
      setTimeRemaining(data.timeRemaining || 0);
    };

    // Listen for round end
    const handleRoundEnd = (data: any) => {
      console.log('Round 0 ended:', data);
      setIsRoundActive(false);
      setRoundStarted(false);
      showInfoToast(data.message || 'Round 0 has ended!');
    };

    // Listen for reconnection
    const handleReconnection = (data: any) => {
      if (data.success) {
        console.log('Reconnected to Round 0:', data);
        showSuccessToast(data.message || 'Reconnected to Round 0');
        // If round is active, navigate to code page
        if (data.currentProblem) {
          router.push('/r0/code');
        }
      }
    };

    // Register event listeners
    socket.on('lobby:round0', handleLobbyUpdate);
    socket.on('round0:start', handleRoundStart);
    socket.on('round0:timer', handleTimerUpdate);
    socket.on('round0:end', handleRoundEnd);
    socket.on('round0:reconnect', handleReconnection);

    return () => {
      socket.off('lobby:round0', handleLobbyUpdate);
      socket.off('round0:start', handleRoundStart);
      socket.off('round0:timer', handleTimerUpdate);
      socket.off('round0:end', handleRoundEnd);
      socket.off('round0:reconnect', handleReconnection);
    };
  }, [socket, isConnected, router]);

  // Join Round 0 lobby on component mount
  useEffect(() => {
    if (!socket || !isConnected || !user) return;

    const joinLobby = () => {
      setIsLoading(true);
      socket.emit('round0:join', {}, (response: any) => {
        setIsLoading(false);
        if (response?.success) {
          console.log('Successfully joined Round 0 lobby');
          setParticipants(response.participants || []);
          showSuccessToast('Joined Round 0 lobby!');
        } else {
          console.error('Failed to join Round 0 lobby:', response?.error);
          showErrorToast(response?.error || 'Failed to join Round 0 lobby');
        }
      });
    };

    joinLobby();
  }, [socket, isConnected, user]);

  // Start Round 0 (Admin only)
  const handleStartRound = () => {
    if (!socket || !isAdmin) return;

    setIsLoading(true);
    socket.emit('round0:ready', {}, (response: any) => {
      setIsLoading(false);
      if (response?.success) {
        console.log('Round 0 starting:', response);
        showSuccessToast(response.message || 'Round 0 is starting!');
      } else {
        console.error('Failed to start Round 0:', response?.error);
        showErrorToast(response?.error || 'Failed to start Round 0');
      }
    });
  };

  // Join active round
  const handleJoinRound = () => {
    router.push('/r0/code');
  };

  return (
    <Waiting
      round="0"
      participants={participants}
      isRoundActive={isRoundActive}
      timeRemaining={timeRemaining}
      roundDuration={roundDuration}
      totalParticipants={totalParticipants}
      isLoading={isLoading}
      roundStarted={roundStarted}
      onStartRound={handleStartRound}
      onJoinRound={handleJoinRound}
    />
  );
}
