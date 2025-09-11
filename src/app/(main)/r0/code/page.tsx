"use client"
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { showSuccessToast, showErrorToast, showInfoToast } from '@/components/shared/CustomToast';
import CodePage from "./CodePage";

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

export default function R0Code() {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const { user, userId, isLoading: authLoading } = useAuth();
  
  // Real state management
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(1200); // 20 minutes
  const [roundDuration] = useState(1200);
  const [isRoundActive, setIsRoundActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [authenticationChecked, setAuthenticationChecked] = useState(false);

  // Handle authentication check first
  useEffect(() => {
    // Don't proceed if auth is still loading
    if (authLoading) {
      return;
    }
    
    // Mark authentication as checked
    setAuthenticationChecked(true);
    
    // Check if user is not authenticated after auth loading is complete
    if (!userId || !user) {
      console.warn('User not authenticated for code page');
      showErrorToast('Please log in to access the coding environment');
      router.push('/dashboard');
      return;
    }
  }, [authLoading, userId, user, router]);

  // Initialize round state when component mounts
  useEffect(() => {
    // Don't initialize if auth hasn't been checked yet
    if (!authenticationChecked || authLoading) {
      return;
    }
    
    // Don't initialize if user is not authenticated
    if (!userId || !user) {
      return;
    }

    if (socket && isConnected && !hasInitialized) {
      console.log('Initializing Round 0 code page...');
      setIsLoading(true);
      
      // Request current state from backend with ack timeout and robust checks
      try {
        // Use socket.io timeout-based ack to avoid silent hangs
        // If the server doesn't ack within the timeout, we handle it explicitly
        (socket as any)
          .timeout(12000) // Increased timeout for stability
          .emit('round0:getState', {}, (err: any, response: any) => {
            if (err) {
              console.error('round0:getState timed out or failed to ack:', err);
              showErrorToast('Server connection failed. Checking round status...');
              setIsLoading(false);
              // Instead of going to lobby, try dashboard first to check round status
              setTimeout(() => router.push('/dashboard'), 2000);
              return;
            }

            try {
              console.log('Round 0 state response:', response);

              if (!response || response.success !== true) {
                const msg = response?.error || 'Round 0 is not currently active';
                console.error('Failed to get Round 0 state:', msg);
                
                // Different error handling based on error type
                if (msg.includes('not active') || msg.includes('not found') || msg.includes('LOBBY')) {
                  showErrorToast('Round 0 is not currently active. Redirecting to lobby...');
                  setTimeout(() => router.push('/r0/lobby'), 1500);
                } else {
                  showErrorToast(msg);
                  setTimeout(() => router.push('/dashboard'), 1500);
                }
                setIsLoading(false);
                return;
              }

              setProblems(response.problems || []);
              setCurrentProblem(response.currentProblem || null);
              setCurrentProblemIndex(response.problemIndex || 0);
              setTimeRemaining(response.timeRemaining || 0);
              setIsRoundActive(true);
              setIsLoading(false);
              
              // Validate that we have problems and current problem
              if (!response.problems || response.problems.length === 0) {
                showErrorToast('No problems found for Round 0');
                setTimeout(() => router.push('/dashboard'), 1500);
                return;
              }
              
              if (!response.currentProblem) {
                showErrorToast('Current problem not found');
                setTimeout(() => router.push('/r0/lobby'), 1500);
                return;
              }
              
              showSuccessToast('Connected to Round 0!');
            } catch (cbErr) {
              console.error('Error handling round0:getState response:', cbErr);
              showErrorToast('Unexpected error parsing server response');
              setIsLoading(false);
              setTimeout(() => router.push('/dashboard'), 1500);
            }
          });
      } catch (emitErr) {
        console.error('Error emitting round0:getState:', emitErr);
        showErrorToast('Failed to request round state');
        setIsLoading(false);
        setTimeout(() => router.push('/dashboard'), 1500);
      }
      
      setHasInitialized(true);
    }
  }, [socket, isConnected, authenticationChecked, hasInitialized, router]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Listen for timer updates
    const handleTimer = (data: any) => {
      console.log('Timer update:', data);
      setTimeRemaining(data.timeRemaining || 0);
    };

    // Listen for round end
    const handleRoundEnd = (data: any) => {
      console.log('Round 0 ended!', data);
      setIsRoundActive(false);
      showSuccessToast('Round 0 has ended! Redirecting to dashboard...');
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
    };

    // Listen for reconnection data (when user refreshes page)
    const handleReconnect = (data: any) => {
      console.log('Round 0 reconnection data:', data);
      
      if (data.success) {
        setCurrentProblem(data.currentProblem || null);
        setCurrentProblemIndex(data.problemIndex || 0);
        setTimeRemaining(data.timeRemaining || 0);
        setIsRoundActive(true);
        setIsLoading(false);
        
        showSuccessToast('Reconnected to Round 0!');
      } else {
        showErrorToast(data.message || 'Failed to reconnect');
        router.push('/r0/lobby');
      }
    };

    // Error handling
    const handleError = (error: any) => {
      console.error('Round 0 error:', error);
      showErrorToast(error.message || 'An error occurred');
    };

    // Register event listeners
    socket.on('round0:timer', handleTimer);
    socket.on('round0:end', handleRoundEnd);
    socket.on('round0:reconnect', handleReconnect);
    socket.on('round0:error', handleError);

    // Cleanup
    return () => {
      socket.off('round0:timer', handleTimer);
      socket.off('round0:end', handleRoundEnd);
      socket.off('round0:reconnect', handleReconnect);
      socket.off('round0:error', handleError);
    };
  }, [socket, router]);

  // Handle next question via socket
  const handleNextQuestion = async () => {
    if (!socket) {
      showErrorToast('Not connected to server');
      return;
    }

    if (currentProblemIndex >= problems.length - 1) {
      showInfoToast('You are already on the last question');
      return;
    }

    console.log('Moving to next question...');
    
    // Set loading state to prevent "Return to Lobby" screen
    setIsLoading(true);

    try {
      (socket as any)
        .timeout(8000)
        .emit('round0:nextQuestion', {}, (err: any, response: any) => {
          setIsLoading(false); // Clear loading state
          
          if (err) {
            console.error('round0:nextQuestion timed out or failed to ack:', err);
            showErrorToast('Server did not respond. Please try again.');
            return;
          }
          console.log('Next question response:', response);
          if (response?.success) {
            setCurrentProblem(response.problem || response.currentProblem);
            setCurrentProblemIndex(response.problemIndex);
            showSuccessToast(`Moved to question ${response.problemIndex + 1}`);
          } else {
            showErrorToast(response?.error || 'Failed to move to next question');
          }
        });
    } catch (err) {
      setIsLoading(false); // Clear loading state on error
      console.error('Error emitting round0:nextQuestion:', err);
      showErrorToast('Failed to request next question');
    }
  };

  // Return to lobby handler
  const handleReturnToLobby = () => {
    router.push('/r0/lobby');
  };

  // Show loading screen while authentication is being checked
  if (authLoading || !authenticationChecked) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 flex items-center justify-center">
            <img src="/battlecode_logo.png" alt="Loading..." className="h-32 w-fit animate-pulse" />
          </div>
          <p className="text-gray-400 text-lg">
            {authLoading ? "Verifying authentication..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  // Show error if user is not authenticated
  if (!user || !userId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 flex items-center justify-center">
            <img src="/battlecode_logo.png" alt="Error" className="h-32 w-fit opacity-50" />
          </div>
          <p className="text-red-400 text-lg mb-4">Authentication required</p>
          <p className="text-gray-400">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

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
