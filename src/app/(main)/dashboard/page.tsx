"use client"
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import CustomScrollbar from "@/components/shared/CustomScrollbar";
import { showErrorToast, showSuccessToast } from "@/components/shared/CustomToast";
import SignOut from "@/components/auth/SignOut";
import LoadingOverlay from "@/components/shared/LoadingOverlay";

// Interfaces
interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  username: string;
  score: number;
  currentRound: number;
  regNo: string;
  trend: string;
}

interface RoundInfo {
  roundNumber: number;
  status: 'LOBBY' | 'COMPLETED' | 'LOCKED' | 'IN_PROGRESS';
  isActive: boolean;
  isLocked: boolean;
}

interface CurrentRoundData {
  currentRoundNumber: number;
  currentRoundStatus: string;
  rounds: RoundInfo[];
}

export default function Dashboard() {
  const { user, session, isLoading, userRole, userName } = useAuth();
  const { socket, isConnected } = useSocket();
  const router = useRouter();

  // State declarations
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentRoundData, setCurrentRoundData] = useState<CurrentRoundData | null>(null);
  const [islocked, setIsLocked] = useState([true, true, true, true]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasConnectedOnce, setHasConnectedOnce] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [hasShownLoginToast, setHasShownLoginToast] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const prevUserRef = useRef(user);

  
  const handleLeaderboard = useCallback((data: { leaderboard: LeaderboardEntry[] }) => {
    setLeaderboard(data.leaderboard);
    if (isClient) {
      localStorage.setItem('battlecode_leaderboard', JSON.stringify(data.leaderboard));
    }
  }, [isClient]);

  const handleCurrentRound = useCallback((data: CurrentRoundData) => {
    setCurrentRoundData(data);

    const newLockedStatus = [true, true, true, true];
    data.rounds.forEach((round: RoundInfo) => {
      if (round.roundNumber >= 0 && round.roundNumber <= 3) {
        newLockedStatus[round.roundNumber] = round.isLocked;
      }
    });
    
    setIsLocked(newLockedStatus);

    if (isClient) {
      localStorage.setItem('battlecode_rounds', JSON.stringify(data));
      localStorage.setItem('battlecode_locks', JSON.stringify(newLockedStatus));
    }
  }, [isClient]);

  const handleAdminAdded = useCallback((roundNumber: number) => {
    console.log(`You have been added to Round ${roundNumber} by an admin`);
    
    // Set up a ONE-TIME listener for the fresh data
    const handleFreshData = (data: CurrentRoundData) => {
      console.log("Received fresh round data:", data);
      
      // Now we have FRESH data from the server
      const targetRound = data.rounds.find((r: RoundInfo) => r.roundNumber === roundNumber);
      
      if (!targetRound) {
        showErrorToast(`Round ${roundNumber} data not found`);
        return;
      }

      const roundStatus = targetRound.status;
      console.log(`Round ${roundNumber} status:`, roundStatus);

      if (roundStatus === 'COMPLETED') {
        showErrorToast(`Round ${roundNumber} has already completed`);
        return;
      }
      
      if (roundStatus === 'LOCKED') {
        showErrorToast(`Round ${roundNumber} is currently locked`);
        return;
      }

      // Navigate based on status
      if (roundStatus === 'LOBBY') {
        showSuccessToast(`You have been added to Round ${roundNumber}! Redirecting to lobby...`);
        setTimeout(() => router.push(`/r${roundNumber}/lobby`), 1500);
      } else if (roundStatus === 'IN_PROGRESS') {
        if (roundNumber === 1) {
          showSuccessToast("You have been added to Round 1! Redirecting to waiting room...");
          setTimeout(() => router.push('/r1/waiting'), 1500);
        } else if (roundNumber === 2) {
          showSuccessToast("You have been added to Round 2! Redirecting...");
          setTimeout(() => router.push('/r2/lobby'), 1500);
        } else {
          showSuccessToast(`You have been added to Round ${roundNumber}! Redirecting to coding environment...`);
          setTimeout(() => router.push(`/r${roundNumber}/code`), 1500);
        }
      }
    };
    
    // Listen for the response (ONE TIME ONLY)
    socket?.once("server:currentRound", handleFreshData);
    
    // Request the fresh data
    socket?.emit("user:current-round");
    
  }, [router, socket]);

  // Helper Functions
  const getBorderColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return '!border-green-500/50 !border-2';
      case 'IN_PROGRESS':
        return '!border-amber-600 !border-2';
      case 'LOBBY':
        return '!border-orange-500/80 !border-2';
      case 'LOCKED':
      default:
        return '!border-gray-400/50 !border-2';
    }
  };

  const handleRoundClick = (roundNumber: number, locked: boolean, status: string) => {
    if (!locked && status !== 'COMPLETED') {
      router.push(`r${roundNumber}/rules`);
    }
  };

  // Constants
  const titles = ["Qualifier", "Head to Head", "Elite Bounties", "The Final Hack"];
  const leaderboard_titles = ["Rank", "Player", "Score"];
  const fallbackLeaderboard = [
    [1, "cypher", 2450, ""],
    [2, "glitch", 2300, ""],
    [3, "reaver", 2288, ""],
    [4, "sentinel", 2150, ""],
    [5, "omen", 2000, ""],
    [6, "vex", 1950, ""],
    [7, "jett", 1800, ""],
    [8, "raze", 1750, ""],
    [9, "sage", 1720, ""],
    [10, "phoenix", 1700, ""],
  ];

  // useEffect Hooks
  useEffect(() => {
    const prevUser = prevUserRef.current;
    
    // Only redirect if we're done loading AND have no session at all
    // Don't redirect if we have a session but user is still being verified
    if (!isLoading && !session) {
      console.warn("Unauthorized access to dashboard - no session - redirecting to home");
      if (prevUser) {
        showErrorToast("Authentication failed. Please log in again.");
      }

      // Add a small delay before redirect to ensure user sees the toast
      const redirectTimer = setTimeout(() => {
        router.push('/');
      }, 2000);

      return () => clearTimeout(redirectTimer);
    }
    
    // If we have a session but no user and we're not loading, it means verification is in progress
    if (!isLoading && session && !user) {
      
    }
    
    prevUserRef.current = user;
  }, [user, session, isLoading, router]);

  // Load data from localStorage after hydration (SECOND useEffect)
  useEffect(() => {
    setIsClient(true);

    // Load persisted data from localStorage
    const savedLeaderboard = localStorage.getItem('battlecode_leaderboard');
    const savedRounds = localStorage.getItem('battlecode_rounds');
    const savedLocks = localStorage.getItem('battlecode_locks');

    if (savedLeaderboard) {
      setLeaderboard(JSON.parse(savedLeaderboard));
    }
    if (savedRounds) {
      setCurrentRoundData(JSON.parse(savedRounds));
    }
    if (savedLocks) {
      setIsLocked(JSON.parse(savedLocks));
    }
  }, []);

  // Show login toast when user is authenticated and connected (THIRD useEffect)

  useEffect(() => {
    const prevUser = prevUserRef.current;
    if (!prevUser && user && !isLoading && !hasShownLoginToast) {
    
      showSuccessToast("Successfully logged in");
      setHasShownLoginToast(true);
      
      // Check if user is admin
      setIsAdmin(userRole === 'ADMIN');
    }
    if (prevUser && !user && !isLoading) {

      showSuccessToast("Signed Out");
      setHasShownLoginToast(false);
      setIsAdmin(false);
    }
  }, [user, isLoading, hasShownLoginToast, userRole]);

  // Update admin status when userRole changes
  useEffect(() => {
    const shouldBeAdmin = userRole === 'ADMIN';
    if (shouldBeAdmin !== isAdmin) {
      setIsAdmin(shouldBeAdmin);
    }
  }, [userRole, isAdmin]);


  // Socket event handlers (FOURTH useEffect)
  useEffect(() => {
    console.log("🔧 Dashboard useEffect triggered", {
      hasSocket: !!socket,
      isConnected,
      socketId: socket?.id
    });

    // Mark as connected once we have a socket connection
    if (isConnected && socket) {
      setHasConnectedOnce(true);
      setIsInitialLoad(false);
    }

    if (!socket || !isConnected) {
      return;
    }

    // Set up event listeners - just pass the function references
    socket.on("server:leaderboard", handleLeaderboard);
    socket.on("server:currentRound", handleCurrentRound);
    socket.on('round0:adminAdded', () => handleAdminAdded(0));
    socket.on('round1:adminAdded', () => handleAdminAdded(1));
    socket.on('round2:adminAdded', () => handleAdminAdded(2));
    socket.on('round3:adminAdded', () => handleAdminAdded(3));

    // Request initial data when socket connects
    socket.emit("client:join");
    socket.emit("client:getLeaderboard");
    socket.emit("client:getCurrentRound");

    // Cleanup function
    return () => {
      socket.off("server:leaderboard", handleLeaderboard);
      socket.off("server:currentRound", handleCurrentRound);
      socket.off('round0:adminAdded');
      socket.off('round1:adminAdded');
      socket.off('round2:adminAdded');
      socket.off('round3:adminAdded');
    };
  }, [socket, isConnected, handleLeaderboard, handleCurrentRound, handleAdminAdded]);

  return (
    <>
      <div className="bg-[url('/bg-dashboard.svg')] h-screen bg-cover bg-center flex flex-col relative overflow-hidden">
        {/* Loading/Authentication Overlay */}
        <LoadingOverlay 
          isLoading={isLoading || !user || !session}
          message={isLoading ? "Verifying authentication..." : "Redirecting..."}
        />
        <div className="flex-shrink-0 h-15 bg-white/1">
          <div className="h-full">
          <div className="flex-1 ml-3 orbitron flex justify-between items-start h-full px-2 pt-2">
            <p className="orbitron text-white my-0">{"<> Battlecode Arena"}</p>
            <div className="flex flex-col items-center mr-20">
              <p className="text-[10px] text-white">Powered by</p>
              <p className="text-lg text-orange-400 font-semibold -mt-0.5">Judge0</p>
            </div>
            <div className="flex justify-end">
              <SignOut />
            </div>
          </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col lg:flex-row p-4 lg:p-0 gap-4 lg:gap-0 min-h-0">
          <div className="flex-[1.5] flex flex-col ">
            <div className="flex-[0.5] flex flex-col lg:ml-5 justify-center">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl text-white flex-wrap flex-[0.2] flex justify-start items-center">
                <p className = "font-bold">Welcome </p>
                <span className="text-orange-500 text-3xl sm:text-4xl lg:text-5xl ml-2">
                  {(isLoading || (user && !userName)) ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    userName || 'Warrior'
                  )}
                </span>
                
              </h1>
              {/* <p className ="flex-[1] flex ">
                
                

              </p> */}
              
            </div>
            <div className = "flex-[0.8] lg:ml-5 mt-3 text-2xl sm:text-3xl lg:text-4xl flex justify-start items-center orbitron text-white"> <p className="text-orange-500">Competition</p> &nbsp;Rounds</div>
            <div className="flex-4 ">
              {[0, 1, 2, 3].map((i) => {
                const roundStatus = currentRoundData?.rounds.find((r: RoundInfo) => r.roundNumber === i);
                const locked = islocked[i];
                const currentStatus = roundStatus?.status || 'LOCKED';

                return (
                  <div className={`flex-[1.2] flex justify-center items-center pb-5 `} key={i}>
                    <div
                      className={`w-full lg:w-[95%] h-[90%] rounded-2xl flex glass-box justify-center ${getBorderColor(currentStatus)} items-center pl-5 transition-transform duration-200 ${!locked && currentStatus !== 'COMPLETED' ? ' hover:-translate-y-2 cursor-pointer ' : 'cursor-not-allowed opacity-60'
                        }`}
                      role="button"
                      tabIndex={0}
                      aria-disabled={locked}
                      onClick={() => handleRoundClick(i, locked, currentStatus)}
                    >
                      <div className={`rounded-[50%] h-15 w-15 ml-1 ${currentStatus === 'LOCKED' || currentStatus === 'COMPLETED'
                        ? currentStatus === 'COMPLETED' 
                          ? "border-green-500/50"
                          : "border-gray-400/50"
                        : currentStatus === 'IN_PROGRESS'
                          ? "border-amber-600/80"
                          : "border-amber-600/80"
                        } m-1 items-center justify-center flex border-4`}>
                        <p className={`text-2xl lg:text-3xl oxanium ${currentStatus === 'LOCKED'
                          ? "text-gray-400/50"
                          : "text-white"
                          }`}>{i}</p>
                      </div>
                      <div className="flex-5 flex flex-col ml-5">
                        <div className={`flex-2  p-3 ${currentStatus === 'LOCKED'
                          ? "text-gray-400/50"
                          : "text-white"
                          }`}>
                          <p className="text-2xl lg:text-3xl font-medium">{titles[i]}</p>
                          <p>
                            {currentStatus === 'LOCKED'
                              ? "Locked"
                              : currentStatus === 'COMPLETED'
                                ? "Completed"
                                : currentStatus === 'IN_PROGRESS'
                                  ? "In Progress"
                                  : currentStatus === 'LOBBY'
                                    ? "Starting Soon"
                                    : "Available"}
                          </p>
                        </div>
                        
                        <div className={`flex-1 ${currentStatus === 'LOCKED'
                          ? "text-gray-400/50"
                          : "text-white"
                          }`}>
                          
                        </div>
                      </div>
                      <div className={`flex-[0.5] flex justify-center items-center`}>
                        {currentStatus === 'LOCKED' ? (
                          <Image src="/lock.svg" alt="Locked" width={16} height={16} />
                        ) : currentStatus === 'COMPLETED' ? (
                          <Image src="/tick.png" alt="Completed" width={16} height={16} className = "opacity-80" />
                        ) : currentStatus === 'IN_PROGRESS' ? (
                          <div className="w-4 h-4 bg-orange-500 rounded-lg animate-pulse"></div>
                        ) : (
                          <div className="w-4 h-4 bg-orange-500 rounded-lg animate-pulse"></div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
          <div className="flex-1 flex justify-center items-stretch overflow-hidden min-h-0 mb-5 mr-2">
            <div className="w-full h-full rounded-lg border-2 mb-4 flex flex-col glass-box overflow-hidden max-h-full">
              <div className="flex-shrink-0 border-b border-gray-700 justify-center items-center flex p-4">
                <Image src="/leaderboard-img.svg" alt="Leaderboard" className="w-4 h-4 mr-2" width={16} height={16} /><span></span>
                <p className="text-2xl text-orange-500">Live Leaderboard</p>
                {!isConnected && !hasConnectedOnce && (
                  <span className="ml-2 text-sm text-gray-400">(Connecting...)</span>
                )}
                {!isConnected && hasConnectedOnce && (
                  <span className="ml-2 text-sm text-yellow-400">(Reconnecting...)</span>
                )}
                {isConnected && (
                  <span className="ml-2 text-sm text-green-400">●</span>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <CustomScrollbar className="h-full overflow-y-auto px-4 pb-4">
                <table className="min-w-full text-left text-sm  text-white">
                  <thead>
                    <tr className="border-b border-gray-700">
                      {leaderboard_titles.map((title, idx) => (
                        <th key={idx} className="py-2 px-3 font-bold text-white">{title}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.length > 0 ? (
                      // Display real leaderboard data from socket or localStorage
                      leaderboard.map((entry, idx) => (
                        <tr key={entry.id || idx} className="border-gray-800 hover:bg-white/5 transition">
                          <td className="py-2 px-3 text-white">{entry.rank}</td>
                          <td className="py-2 px-3 text-white">
                            <div className="flex flex-col">
                              <span className="font-medium">{entry.username !== 'Not Set' ? entry.username : entry.name}</span>
                              {entry.username !== 'Not Set' && entry.name && (
                                <span className="text-xs text-gray-400">{entry.name}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-white">{entry.score}</td>
                          
                        </tr>
                      ))
                    ) : isInitialLoad ? (
                      // Show loading state only on very first load
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-400">
                          <div className="flex items-center justify-center space-x-2">
                            <div className="w-4 h-4 bg-orange-500 rounded-full animate-pulse"></div>
                            <span>Loading leaderboard...</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      // Display fallback data only if no cached data exists
                      fallbackLeaderboard.map((row, idx) => (
                        <tr key={idx} className="border-gray-800 hover:bg-white/5 transition opacity-50">
                          {row.map((cell, cidx) => (
                            <td key={cidx} className="py-2 px-3 text-white">{cell}</td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                </CustomScrollbar>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Controls - Positioned after 100vh */}
      


    </>

  )

};