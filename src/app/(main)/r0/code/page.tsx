"use client"
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/contexts/SocketContext";
import { useAuth } from "@/contexts/AuthContext";
import CodePage from "@/components/shared/CodePage";
import { showSuccessToast, showErrorToast, showInfoToast } from "@/components/shared/CustomToast";

interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  constraints: string[];
  boilerplate: { [key: string]: string };
  sampleTestCases: TestCase[];
  hiddenTestCases?: TestCase[];
  testCases?: TestCase[]; // Legacy support
  hints: string[];
  avgTimeComplexity?: string;
  avgSpaceComplexity?: string;
}

interface TestCase {
  stdin?: string;
  expected_output?: string;
  input?: {
    stdin?: string;
    json?: any;
  };
  output?: {
    stdout?: string;
    json?: any;
  };
  explanation?: string;
}

interface Round0Status {
  isActive: boolean;
  currentProblem: Problem;
  problems: Problem[];
  problemIndex: number;
  timeRemaining: number;
  duration: number;
}

export default function R0Code() {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  
  // Round 0 state
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [roundDuration, setRoundDuration] = useState(1200);
  const [isRoundActive, setIsRoundActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Global error handler to prevent unhandled rejections from crashing the app
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection in R0 Code:', {
        reason: event.reason,
        stack: event.reason?.stack,
        message: event.reason?.message,
        type: typeof event.reason,
        stringified: JSON.stringify(event.reason),
        constructor: event.reason?.constructor?.name,
        isEmptyObject: event.reason && typeof event.reason === 'object' && Object.keys(event.reason).length === 0
      });
      
      console.trace('Promise rejection stack trace');
      event.preventDefault(); // Prevent the error from bubbling up
      
      // Check for specific cancellation errors and ignore them
      if (event.reason && typeof event.reason === 'object') {
        if (event.reason.type === 'cancelation' || event.reason.msg?.includes('canceled')) {
          console.log('Ignoring cancellation error - likely due to component state change');
          return;
        }
      }
      
      // Only show toast for non-empty, non-cancellation errors
      if (event.reason && (typeof event.reason !== 'object' || Object.keys(event.reason).length > 0)) {
        showErrorToast('An error occurred, but you can continue coding');
      }
    };

    const handleError = (event: ErrorEvent) => {
      console.error('Unhandled error in R0 Code:', {
        error: event.error,
        stack: event.error?.stack,
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
      event.preventDefault(); // Prevent the error from bubbling up
      showErrorToast('An error occurred, but you can continue coding');
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  // Socket event handlers
  useEffect(() => {
    if (!socket || !isConnected) return;

    console.log('Setting up socket event handlers in R0 Code');

    // Listen for round start
    const handleRoundStart = async (data: any) => {
      try {
        console.log('Round 0 started in code page:', data);
        setProblems(data.problems || []);
        setRoundDuration(data.duration || 1200);
        setTimeRemaining(data.duration || 1200);
        setIsRoundActive(true);
        
        if (data.problems && data.problems.length > 0) {
          const firstProblem = data.problems[0];
          setCurrentProblem(firstProblem);
          setCurrentProblemIndex(0);
        }
        
        showSuccessToast(data.message || 'Round 0 has started!');
      } catch (error) {
        console.error('Error handling round start:', error);
        showErrorToast('Error starting round');
      }
    };

    // Listen for timer updates
    const handleTimerUpdate = (data: any) => {
      try {
        setTimeRemaining(data.timeRemaining || 0);
      } catch (error) {
        console.error('Error handling timer update:', error);
      }
    };

    // Listen for round end
    const handleRoundEnd = (data: any) => {
      try {
        console.log('Round 0 ended:', data);
        setIsRoundActive(false);
        showInfoToast(data.message || 'Round 0 has ended!');
        
        // Redirect to lobby after round ends
        setTimeout(() => {
          router.push('/r0/lobby');
        }, 3000);
      } catch (error) {
        console.error('Error handling round end:', error);
      }
    };

    // Listen for reconnection data
    const handleReconnection = async (data: any) => {
      try {
        console.log('Reconnection event received:', data);
        if (data.success && data.currentProblem) {
          console.log('Processing reconnection data');
          setCurrentProblem(data.currentProblem);
          setCurrentProblemIndex(data.problemIndex || 0);
          setTimeRemaining(data.timeRemaining || 0);
          setProblems(data.problems || [data.currentProblem]);
          setIsRoundActive(true);
          
          showSuccessToast(data.message || 'Reconnected successfully');
        } else {
          console.log('Reconnection failed or no current problem:', data);
        }
      } catch (error) {
        console.error('Error handling reconnection:', error);
        showErrorToast('Error reconnecting');
      }
    };

    // Register event listeners
    socket.on('round0:start', handleRoundStart);
    socket.on('round0:timer', handleTimerUpdate);
    socket.on('round0:end', handleRoundEnd);
    socket.on('round0:reconnect', handleReconnection);

    return () => {
      socket.off('round0:start', handleRoundStart);
      socket.off('round0:timer', handleTimerUpdate);
      socket.off('round0:end', handleRoundEnd);
      socket.off('round0:reconnect', handleReconnection);
    };
  }, [socket, isConnected, router]);

  // Check for reconnection on mount
  useEffect(() => {
    if (!socket || !isConnected || !user) return;

    let isMounted = true; // Track if component is still mounted
    setIsLoading(true);
    
    // Request reconnection explicitly
    const requestReconnection = () => {
      console.log('Requesting reconnection data...');
      
      try {
        socket.emit('round0:getState', {}, (response: any) => {
          // Only process response if component is still mounted
          if (!isMounted) {
            console.log('Component unmounted, ignoring reconnection response');
            return;
          }
          
          try {
            console.log('Reconnection response received:', response);
            if (response?.success && response?.currentProblem) {
              console.log('Setting problem data from reconnection');
              setCurrentProblem(response.currentProblem);
              setCurrentProblemIndex(response.problemIndex || 0);
              setTimeRemaining(response.timeRemaining || 0);
              setProblems(response.problems || [response.currentProblem]);
              setIsRoundActive(true);
              
              showSuccessToast(response.message || 'Reconnected successfully');
            } else {
              console.log('No active round found, response:', response);
            }
          } catch (error) {
            console.error('Error processing reconnection response:', error);
          } finally {
            if (isMounted) {
              setIsLoading(false);
            }
          }
        });
      } catch (error) {
        console.error('Error emitting reconnection request:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Try to get reconnection data immediately
    requestReconnection();

    // Also set a timeout to stop loading even if no response
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    }, 5000);

    return () => {
      isMounted = false; // Mark component as unmounted
      clearTimeout(timeoutId);
    };
    
  }, [socket, isConnected, user]);

  // Next question handler
  const handleNextQuestion = async () => {
    if (!socket || !isConnected) {
      showErrorToast('Not connected to server');
      return;
    }

    try {
      setIsLoading(true);
      
      const response: any = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Request timeout'));
        }, 10000); // 10 second timeout

        try {
          socket.emit('round0:nextQuestion', {}, (response: any) => {
            clearTimeout(timeout);
            if (response) {
              resolve(response);
            } else {
              reject(new Error('No response received'));
            }
          });
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      });

      if (response?.success) {
        setCurrentProblem(response.problem);
        setCurrentProblemIndex(response.problemIndex);
        setTimeRemaining(response.timeRemaining || 0);
        showSuccessToast(`Moved to question ${response.problemIndex + 1}`);
      } else {
        showErrorToast(response?.error || 'Failed to get next question');
      }
    } catch (error) {
      console.error('Error handling next question request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showErrorToast(`Error getting next question: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Return to lobby handler
  const handleReturnToLobby = () => {
    router.push('/r0/lobby');
  };

  return (
    <CodePage
      round="0"
      currentProblem={currentProblem}
      problems={problems}
      currentProblemIndex={currentProblemIndex}
      timeRemaining={timeRemaining}
      roundDuration={roundDuration}
      isRoundActive={isRoundActive}
      isLoading={isLoading}
      onNextQuestion={handleNextQuestion}
      onReturnToLobby={handleReturnToLobby}
    />
  );
}
