"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/contexts/SocketContext";
import { useAuth } from "@/contexts/AuthContext";
import CodePageComponent from "./CodePage"; // Assuming CodePage is in the same directory
import { showSuccessToast, showErrorToast, showInfoToast } from "@/components/shared/CustomToast";

// --- Interfaces ---
interface MatchData {
  opponent: { id: string; rank?: number; };
  question: {
    id: string; title: string; description: string; difficulty: string;
    duration?: number; constraints?: string[]; boilerplate?: { [key: string]: string };
    sampleTestCases?: TestCase[]; hints?: string[];
  };
  startTime: number; duration: number; difficulty?: string;
}

interface TestCase {
  stdin?: string; expected_output?: string;
  input?: { stdin?: string; json?: unknown; };
  output?: { stdout?: string; json?: unknown; };
  explanation?: string;
}

// --- Main Wrapper Component ---
export default function R1Code() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { socket, isConnected } = useSocket();
  
  // --- All State is Managed Here in the Parent ---
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [pageIsLoading, setPageIsLoading] = useState(true);
  
  const [showMatchEndPopup, setShowMatchEndPopup] = useState(false);
  const [matchEndData, setMatchEndData] = useState<{type: 'win' | 'lose' | 'timeout', message: string} | null>(null);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // --- All Socket Event Listeners are Handled Here ---
  useEffect(() => {
    if (!socket || !isConnected) return;
    
    const handleTimerUpdate = (data: { timeRemaining: number }) => {
      if (isMountedRef.current) setTimeRemaining(data.timeRemaining || 0);
    };
    
    const handleMatchEnd = (data: {type: 'win' | 'lose' | 'timeout', message: string}) => {
      if (isMountedRef.current) {
        sessionStorage.removeItem('round1_match_data');
        setMatchEndData(data);
        setShowMatchEndPopup(true);
      }
    };
    
    const handleRoundEnd = () => {
      if (isMountedRef.current) {
        sessionStorage.removeItem('round1_match_data');
        showInfoToast('Round 1 has ended');
        setTimeout(() => router.push('/dashboard'), 3000);
      }
    };
    
    socket.on('round1:timerUpdate', handleTimerUpdate);
    socket.on('round1:matchEnd', handleMatchEnd);
    socket.on('round1:ended', handleRoundEnd);
    
    return () => {
      socket.off('round1:timerUpdate', handleTimerUpdate);
      socket.off('round1:matchEnd', handleMatchEnd);
      socket.off('round1:ended', handleRoundEnd);
    };
  }, [socket, isConnected, router]);

  // --- Main Initialization Logic ---
  useEffect(() => {
    const isReady = !isAuthLoading && user && socket && isConnected;
    if (!isReady) return;

    const storedDataRaw = sessionStorage.getItem('round1_match_data');
    if (storedDataRaw) {
        try {
            const data = JSON.parse(storedDataRaw);
            setMatchData(data);
            const elapsed = (Date.now() - data.startTime) / 1000;
            setTimeRemaining(Math.max(0, Math.floor(data.duration / 1000 - elapsed)));

            // --- THIS IS THE FIX ---
            // On every load (including refresh), tell the server we have reconnected.
            // This allows the server to put our new socket connection into the match room.
            socket.emit('round1:join', {}, (response: any) => {
              if (response?.success) {
                console.log("Successfully rejoined match room on server.");
              } else {
                console.error("Failed to rejoin match room:", response?.error);
              }
            });
            // --- END OF FIX ---

        } catch (e) {
            showErrorToast("Invalid match data. Returning to waiting room.");
            router.push('/r1/waiting');
        }
    } else {
        showInfoToast("No active match data found.");
        router.push('/r1/waiting');
    }
    setPageIsLoading(false);

  }, [isAuthLoading, user, socket, isConnected, router]);

  const handleMatchEndClose = () => {
    setShowMatchEndPopup(false);
    showInfoToast('Returning to the waiting room for your next match...');
    router.push('/r1/waiting');
  };

  if (pageIsLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black/40 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <p>Loading Round 1 Match...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <CodePageComponent 
        matchData={matchData}
        timeRemaining={timeRemaining}
      />
      
      {showMatchEndPopup && matchEndData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 p-8 rounded-lg border-2 border-orange-500 text-center max-w-md">
            <h2 className={`text-3xl font-bold mb-4 ${
              matchEndData.type === 'win' ? 'text-green-400' : 
              matchEndData.type === 'lose' ? 'text-red-400' : 'text-yellow-400'
            }`}>
              {matchEndData.type === 'win' ? '🎉 Victory!' : 
               matchEndData.type === 'lose' ? '😔 Defeat' : '⏰ Time Up!'}
            </h2>
            <p className="text-white text-lg mb-6">{matchEndData.message}</p>
            <button
              onClick={handleMatchEndClose}
              className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors"
            >
              Continue to Waiting Room
            </button>
          </div>
        </div>
      )}
    </>
  );
}