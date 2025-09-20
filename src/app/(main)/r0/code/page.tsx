"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/contexts/SocketContext";
import { useAuth } from "@/contexts/AuthContext";
import CodePage from "./CodePage";
import { showSuccessToast, showErrorToast, showInfoToast } from "@/components/shared/CustomToast";

// --- Interfaces ---
interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  constraints: string[];
  boilerplate: { [key: string]: string };
  sampleTestCases: TestCase[];
  hiddenTestCases?: TestCase[];
  testCases?: TestCase[];
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
  currentProblem?: Problem;
  problemIndex?: number;
  timeRemaining?: number;
  problems?: Problem[];
  [key: string]: unknown;
}

interface NextQuestionResponse {
  success?: boolean;
  error?: { message?: string } | string;
  problem?: Problem;
  problemIndex?: number;
  timeRemaining?: number;
  [key: string]: unknown;
}

// --- Component ---
export default function R0Code() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { socket, isConnected, isLoading: isSocketLoading } = useSocket();
  
  // --- State Management ---
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [roundDuration, setRoundDuration] = useState(600);
  const [isRoundActive, setIsRoundActive] = useState(false);
  const [pageIsLoading, setPageIsLoading] = useState(true);

  // --- Refs for Lifecycle Management ---
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

      localStorage.removeItem(`battlecode-round-0-code-store`);
      
    
  
      setIsRoundActive(false);
      showInfoToast(data.message || 'Round 0 has ended!');
      setTimeout(() => {
        if (isMountedRef.current) router.push('/r0/lobby');
      }, 3000);
    };
    
    socket.on('round0:timer', handleTimerUpdate);
    socket.on('round0:end', handleRoundEnd);
    return () => {
      socket.off('round0:timer', handleTimerUpdate);
      socket.off('round0:end', handleRoundEnd);
    };
  }, [socket, isConnected, router]);


  // --- Main Initialization Logic ---
  useEffect(() => {
    const isAppReady = !isAuthLoading && !isSocketLoading && user && socket && isConnected;
    if (!isAppReady || hasInitialized.current) {
      return;
    }
    hasInitialized.current = true;

    // PRIMARY METHOD: Attempt to load data from sessionStorage
    const storedDataRaw = sessionStorage.getItem('round0_data');
    if (storedDataRaw) {
      console.log("✅ Data found in sessionStorage. Initializing page.");
      try {
        const storedData = JSON.parse(storedDataRaw);
        sessionStorage.removeItem('round0_data'); // Clean up immediately

        const { problems: initialProblems, duration, startTime } = storedData;
        
        setProblems(initialProblems);
        setRoundDuration(duration);
        if (initialProblems.length > 0) {
          setCurrentProblem(initialProblems[0]);
          setCurrentProblemIndex(0);
        }
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setTimeRemaining(Math.max(duration - elapsed, 0));
        setIsRoundActive(true);
        setPageIsLoading(false);
        return; // Success, no need to fetch
      } catch (error) {
        console.error("Failed to parse sessionStorage data:", error);
        // If parsing fails, proceed to fetch from server as a fallback.
      }
    }

    // FALLBACK METHOD: Only runs if sessionStorage is empty (e.g., on page refresh)
    console.log("🟡 No session data. Fetching from server (fallback).");
    socket.emit('round0:getState', {}, (response: StateResponse) => {
      if (!isMountedRef.current) return;
      try {
        if (response?.success && response?.currentProblem) {
          setCurrentProblem(response.currentProblem);
          setCurrentProblemIndex(response.problemIndex || 0);
          setTimeRemaining(response.timeRemaining || 0);
          setProblems(response.problems || [response.currentProblem]);
          setIsRoundActive(true);
        } else {
          const errorMessage = typeof response?.error === 'string' ? response.error : 
                              (response?.error?.message || 'No active round found.');
          showErrorToast(errorMessage);
          localStorage.removeItem(`battlecode-round-0-code-store`);
          router.push('/r0/lobby');
        }
      } catch (error) {
        console.error('Error processing round state:', error);
        showErrorToast('Failed to load round data. Please try again.');
        router.push('/r0/lobby');
      }
      setPageIsLoading(false);
    });

  }, [isAuthLoading, isSocketLoading, user, socket, isConnected, router]);
  
  // --- User Action Handlers ---
  const handleNextQuestion = async () => {
    if (!socket || !isConnected) {
      showErrorToast('Not connected to server');
      return;
    }

    setPageIsLoading(true);
    try {
      const response: NextQuestionResponse = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Request timeout')), 10000);
          socket.emit('round0:nextQuestion', {}, (res: NextQuestionResponse) => {
              clearTimeout(timeout);
              resolve(res);
          });
      });

      if (!isMountedRef.current) return;

      if (response?.success) {
        if (response.problem) setCurrentProblem(response.problem);
        if (response.problemIndex !== undefined) setCurrentProblemIndex(response.problemIndex);
        setTimeRemaining(response.timeRemaining || 0);
        showSuccessToast(`Moved to question ${(response.problemIndex || 0) + 1}`);
      } else {
        const errorMessage = typeof response?.error === 'string' ? response.error : 
                            (response?.error?.message || 'Failed to get next question');
        showErrorToast(errorMessage);
      }
    } catch (error) {
      if (isMountedRef.current) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          showErrorToast(`Error getting next question: ${errorMessage}`);
      }
    } finally {
      if (isMountedRef.current) {
        setPageIsLoading(false);
      }
    }
  };

  const handleReturnToLobby = () => router.push('/r0/lobby');

  // --- Render ---
  return (
    <CodePage
      round="0"
      currentProblem={currentProblem}
      problems={problems}
      currentProblemIndex={currentProblemIndex}
      timeRemaining={timeRemaining}
      roundDuration={roundDuration}
      isRoundActive={isRoundActive}
      isLoading={pageIsLoading} 
      onNextQuestion={handleNextQuestion}
      onReturnToLobby={handleReturnToLobby}
    />
  );
}