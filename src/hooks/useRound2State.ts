'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSocket } from '@/contexts/SocketContext';

export interface Participant {
  id?: string;
  userId?: string;
  username: string;
  email?: string;
  role?: string;
  status: string;
  rank?: number;
  eventScore?: number;
  socketId?: string;
  joinedAt?: string;
  disconnectedAt?: string;
  reconnectedAt?: string;
  finishedAt?: string;
  cooldownEndTime?: number;
  isReady?: boolean;
}

export interface Round2StatePayload {
  success: boolean;
  state?: {
    round: {
      number: number;
      status: 'LOBBY' | 'IN_PROGRESS' | 'COMPLETED';
      isActive: boolean;
      endTime: number | null;
      timeRemaining: number;
    };
    currentUser: {
      id: string;
      role: 'elite' | 'challenger' | null;
      status: string | null;
      activeSession: boolean;
    };
    participants: Participant[];
    participantsByStatus?: {
      lobby: Participant[];
      waiting?: Participant[];
      in_match?: Participant[];
      cooldown?: Participant[];
      finished?: Participant[];
      disconnected?: Participant[];
    };
  };
  error?: string;
}

export const useRound2State = () => {
  const { socket, isConnected } = useSocket();
  const [state, setState] = useState<Round2StatePayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchState = useCallback(() => {
    if (!socket || !isConnected) return;

    console.debug('[useRound2State] Emitting round2:getState');
    socket.emit('round2:getState');
  }, [socket, isConnected]);

  useEffect(() => {
    if (!socket || !isConnected) {
      setIsLoading(true);
      return;
    }

    const handleState = (payload: Round2StatePayload) => {
      console.debug('[useRound2State] Received round2:state:', payload);
      if (payload.state?.participants) {
        console.debug('[useRound2State] Participants received:', {
          count: payload.state.participants.length,
          participants: payload.state.participants.map(p => ({
            id: p.userId || p.id,
            username: p.username,
            status: p.status,
            role: p.role,
          })),
        });
      }
      if (payload.success && payload.state) {
        setState(payload);
        setError(null);
      } else {
        setError(payload.error || 'Failed to fetch state');
      }
      setIsLoading(false);
    };

    socket.on('round2:state', handleState);
    fetchState();

    return () => {
      socket.off('round2:state', handleState);
    };
  }, [socket, isConnected, fetchState]);

  return { state, isLoading, error, refetch: fetchState };
};
