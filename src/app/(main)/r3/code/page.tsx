"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/contexts/SocketContext";
import { useAuth } from "@/contexts/AuthContext";
import CodePage from "./CodePage";
import { showErrorToast, showInfoToast, showSuccessToast } from "@/components/shared/CustomToast";

// --- Interfaces ---
interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  constraints: string[];
  boilerplate: { [key: string]: string };
  sampleTestCases: TestCase[];
  hints: string[];
}

interface TestCase {
  stdin?: string;
  expected_output?: string;
  input?: { stdin?: string; json?: Record<string, unknown>; };
  output?: { stdout?: string; json?: Record<string, unknown>; };
  explanation?: string;
}

interface TimerData {
  timeRemaining?: number;
}

interface RoundEndData {
  message?: string;
}

interface StateResponse {
  success?: boolean;
  error?: { message?: string } | string;
  questions?: Problem[];
  timeRemaining?: number;
  isHackingPhase?: boolean;
  lockedQuestionIds?: string[];
  [key: string]: unknown;
}

// --- Component ---
export default function Round3Page() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { socket, isConnected, isLoading: isSocketLoading } = useSocket();

  // --- State Management ---
  const [problems, setProblems] = useState<Problem[]>([]);
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [isHackingPhase, setIsHackingPhase] = useState(false);
  const [lockedQuestionIds, setLockedQuestionIds] = useState<string[]>([]);

  const hasInitialized = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // --- Socket Event Listeners ---
  useEffect(() => {
    if (!socket || !isConnected) return;
    
    const handleTimerUpdate = (data: TimerData) => {
      if (isMountedRef.current) setTimeRemaining(data.timeRemaining || 0);
    };

    const handleRoundEnd = (data: RoundEndData) => {
        if (!isMountedRef.current) return;
        localStorage.removeItem(`battlecode-round-3-code-store`);
        showInfoToast(data.message || 'Round 3 has ended!');
        setTimeout(() => {
            if (isMountedRef.current) router.push('/r3/lobby');
        }, 3000);
    };

    const handleHackingPhaseStart = () => {
        if(isMountedRef.current) {
            showInfoToast("Hacking phase has started! You can now lock solved problems.");
            setIsHackingPhase(true);
        }
    };

    socket.on('round3:timer', handleTimerUpdate);
    socket.on('round3:end', handleRoundEnd);
    socket.on('round3:hackingPhaseStart', handleHackingPhaseStart);
    
    return () => {
      socket.off('round3:timer', handleTimerUpdate);
      socket.off('round3:end', handleRoundEnd);
      socket.off('round3:hackingPhaseStart', handleHackingPhaseStart);
    };
  }, [socket, isConnected, router]);


  // --- Main Initialization Logic ---
  useEffect(() => {
    const isAppReady = !isAuthLoading && !isSocketLoading && user && socket && isConnected;
    if (!isAppReady || hasInitialized.current) return;
    hasInitialized.current = true;

    socket.emit('round3:getState', {}, (response: StateResponse) => {
      if (!isMountedRef.current) return;
      try {
        if (response?.success && response?.questions && response.questions.length > 0) {
          setProblems(response.questions);
          setCurrentProblem(response.questions[0]);
          setCurrentProblemIndex(0);
          setTimeRemaining(response.timeRemaining || 0);
          setIsHackingPhase(response.isHackingPhase || false);
          setLockedQuestionIds(response.lockedQuestionIds || []);
        } else {
          const errorMessage = typeof response?.error === 'string' ? response.error : 'No active round found.';
          showErrorToast(errorMessage);
          router.push('/r3/lobby');
        }
      } catch (error) {
        console.error('Error processing round state:', error);
        showErrorToast('Failed to load round data. Please try again.');
        router.push('/r3/lobby');
      }
      setPageIsLoading(false);
    });

  }, [isAuthLoading, isSocketLoading, user, socket, isConnected, router]);

  const handleQuestionSelect = (index: number) => {
    if (problems && problems[index]) {
      setCurrentProblemIndex(index);
      setCurrentProblem(problems[index]);
    }
  };

  const handleLockQuestion = useCallback((questionId: string) => {
    if (!socket) {
        showErrorToast("Not connected to the server.");
        return;
    };
    showInfoToast("Attempting to lock question...");
    socket.emit('round3:lockQuestion', { questionId }, (response: { success: boolean, error?: string, message?: string }) => {
        if (response.success) {
            showSuccessToast(response.message || "Question locked successfully!");
            setLockedQuestionIds(prev => [...prev, questionId]);
        } else {
            showErrorToast(response.error || "Failed to lock question.");
        }
    });
  }, [socket]);

  // --- Render ---
  return (
    <CodePage
      round="3"
      currentProblem={currentProblem}
      problems={problems}
      currentProblemIndex={currentProblemIndex}
      timeRemaining={timeRemaining}
      isLoading={pageIsLoading}
      isHackingPhase={isHackingPhase}
      lockedQuestionIds={lockedQuestionIds}
      onQuestionSelect={handleQuestionSelect}
      onLockQuestion={handleLockQuestion}
    />
  );
}