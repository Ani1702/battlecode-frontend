"use client"
// import ContributionsGrid from "@/components/shared/ContributionsGrid";
// import Rewards from "@/components/shared/Rewards";
// import Navbar from "@/components/shared/Navbar";
import CustomScrollbar from "@/components/shared/CustomScrollbar";
import { showErrorToast, showSuccessToast } from "@/components/shared/CustomToast";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { useRouter } from "next/navigation";
import Image from "next/image";
import SignOut from "@/components/auth/SignOut"
// import toast from "react-hot-toast";
import { useRef } from 'react';





// Define types for socket data
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

interface RoundStatus {
  roundNumber: number;
  status: string;
  isActive: boolean;
  isLocked: boolean;
}

interface CurrentRoundData {
  currentRoundNumber: number;
  currentRoundStatus: string;
  rounds: RoundStatus[];
}

export default function Dashboard() {

  // Admin controls state
  
  // NEW: Round 3 Qualification State
  const [qualifyCount, setQualifyCount] = useState<number | ''>('');
  const [isQualifying, setIsQualifying] = useState(false);

  const { user, session, isLoading, userRole, userName /*username*/ } = useAuth();
  const { socket, isConnected } = useSocket();
  const router = useRouter();

  // State initialization without localStorage during SSR
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentRoundData, setCurrentRoundData] = useState<CurrentRoundData | null>(null);
  const [islocked, setIsLocked] = useState([true, true, true, true]);

  // Loading and connection states
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasConnectedOnce, setHasConnectedOnce] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [hasShownLoginToast, setHasShownLoginToast] = useState(false);

  // Admin controls state
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);

  const prevUserRef = useRef(user);

  // Security: Redirect if not authenticated (FIRST useEffect)
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

 

    // Listen for leaderboard updates
    const handleLeaderboard = (data: { leaderboard: LeaderboardEntry[] }) => {
      
      setLeaderboard(data.leaderboard);
      // Persist to localStorage
      if (isClient) {
        localStorage.setItem('battlecode_leaderboard', JSON.stringify(data.leaderboard));
      }
    };

    // Listen for current round updates
    const handleCurrentRound = (data: CurrentRoundData) => {
     
      setCurrentRoundData(data);

      // Update locked status based on round data
      const newLockedStatus = [true, true, true, true];
      data.rounds.forEach((round) => {
        if (round.roundNumber >= 0 && round.roundNumber <= 3) {
          newLockedStatus[round.roundNumber] = round.isLocked;
        }
      });
      
      setIsLocked(newLockedStatus);

      // Persist to localStorage
      if (isClient) {
        localStorage.setItem('battlecode_rounds', JSON.stringify(data));
        localStorage.setItem('battlecode_locks', JSON.stringify(newLockedStatus));
      }
    };

    // Set up event listeners
    socket.on("server:leaderboard", handleLeaderboard);
    socket.on("server:currentRound", handleCurrentRound);

    // Request initial data when socket connects
   
    socket.emit("client:join");




    socket.emit("client:getLeaderboard");
    socket.emit("client:getCurrentRound");

    // Cleanup function
    return () => {
  
      socket.off("server:leaderboard", handleLeaderboard);
      socket.off("server:currentRound", handleCurrentRound);
    };
  }, [socket, isConnected, isClient]);

  // Constants (after all hooks)
  const titles = ["Qualifier", "Head to Head", "Elite Bounties", "The Final Hack"];
  const leaderboard_titles = ["Rank", "Player", "Score"];

  // Admin functions
  const updateRoundStatus = async (roundNumber: number, newStatus: string) => {
    if (!isAdmin || adminLoading) return;

    setAdminLoading(true);
    if ((newStatus === 'COMPLETED' || newStatus === 'LOCKED') && roundNumber === 0) {
      localStorage.removeItem(`battlecode-round-0-code-store`);
    }
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/rounds/${roundNumber}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();

      if (data.success) {
        showSuccessToast(`Round ${roundNumber} ${newStatus.toLowerCase()}`);
      } else {
        showErrorToast(data.error || 'Failed to update round status');
      }
    } catch (error) {
      console.error('Error updating round status:', error);
      showErrorToast('Failed to update round status');
    } finally {
      setAdminLoading(false);
    }
  };

  const getStatusButtonColor = (currentStatus: string, targetStatus: string) => {
    const statusColors: { [key: string]: string } = {
      'LOCKED': 'bg-gray-600 hover:bg-gray-500',
      'LOBBY': 'bg-orange-600 hover:bg-orange-500',
      'IN_PROGRESS': 'bg-green-600 hover:bg-green-500',
      'COMPLETED': 'bg-purple-600'
    };
    
    if (currentStatus === targetStatus) {
      return statusColors[targetStatus] + ' opacity-50 cursor-not-allowed';
    }
    
    return statusColors[targetStatus];
  };

  const canTransition = (currentStatus: string, targetStatus: string) => {
    const validTransitions: { [key: string]: string[] } = {
      'LOCKED': ['LOBBY'],
      'LOBBY': ['IN_PROGRESS', 'LOCKED'],
      'IN_PROGRESS': ['COMPLETED', 'LOBBY'],
      'COMPLETED': ['LOBBY']
    };    
    return validTransitions[currentStatus]?.includes(targetStatus) || false;
  };

  // NEW: Handle R3 Qualification Emission
  const handleQualifyR3 = () => {
    if (!qualifyCount || qualifyCount <= 0) {
      showErrorToast("Please enter a valid number of players");
      return;
    }
    
    setIsQualifying(true);
    socket?.emit("admin:qualifyRound3", { count: Number(qualifyCount) }, (response: any) => {
      setIsQualifying(false);
      if (response?.success) {
        showSuccessToast(`Successfully qualified top ${qualifyCount} players for Round 3!`);
        setQualifyCount(''); // Reset input after success
      } else {
        showErrorToast(response?.error || "Failed to qualify players");
      }
    });
  };
  // Fallback leaderboard data (in case socket hasn't loaded yet)
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

  return (
    <>
      <div className="bg-[url('/bg-dashboard.svg')] h-screen bg-cover bg-center flex flex-col relative overflow-hidden">
        {/* Loading/Authentication Overlay */}
        {(isLoading || !user || !session) && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="text-center justify-center items-center">
              <div className="mb-4 flex items-center justify-center">
                <Image src="/battlecode_logo.png" alt="Loading..." className="flex h-50 w-fit animate-pulse" width={200} height={50} />
              </div>
              <p className="text-gray-400">
                {isLoading ? "Verifying authentication..." : "Redirecting..."}
              </p>
            </div>
          </div>
        )}
        <div className="flex-shrink-0 h-20">
          <div className="h-full">
          <div className="flex-1 ml-3 orbitron flex justify-start items-start h-full">
            <p className="flex-1 mt-2 orbitron text-white">{"<> Battlecode Arena"}</p>
            <div className="flex-1 flex justify-end mr-2 mt-2">
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
                /*const isCurrentRound = currentRoundData?.currentRoundNumber === i;*/
                const roundStatus = currentRoundData?.rounds.find(r => r.roundNumber === i);
                const locked = islocked[i];
                const currentStatus = roundStatus?.status || 'LOCKED';

                // Determine border color based on status
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

                return (
                  <div className={`flex-[1.2] flex justify-center items-center pb-5 `} key={i}>
                    <div
                      className={`w-full lg:w-[95%] h-[90%] rounded-2xl flex glass-box justify-center ${getBorderColor(currentStatus)} items-center pl-5 transition-transform duration-200 ${!locked && currentStatus !== 'COMPLETED' ? ' hover:-translate-y-2 cursor-pointer ' : 'cursor-not-allowed opacity-60'
                        }`}
                      role="button"
                      tabIndex={0}
                      aria-disabled={locked}
                      onClick={() => {
                        if (!locked && currentStatus !== 'COMPLETED') router.push(`r${i}/rules`);
                      }}
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
      {isAdmin && (
        <div className="min-h-screen w-full bg-[url('/bg-dashboard.svg')] bg-cover bg-center flex items-center justify-center px-5">
          <div className="w-full max-w-6xl rounded-lg border-2 border-orange-500/50 glass-box p-6">
            <div className="flex items-center mb-6">
              <div className="w-4 h-4 bg-orange-500 rounded-full mr-3 animate-pulse"></div>
              <h3 className="text-2xl font-bold text-orange-500">Admin Controls</h3>
              {adminLoading && (
                <div className="ml-3 w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
            
            <div className="grid grid-cols-4 gap-6">
              {[0, 1, 2, 3].map((roundNum) => {
                const roundData = currentRoundData?.rounds.find(r => r.roundNumber === roundNum);
                const currentStatus = roundData?.status || 'LOCKED';
                
                return (
                  <div key={roundNum} className="space-y-3">
                    <h4 className="text-xl font-semibold text-white text-center">
                      Round {roundNum}
                    </h4>
                    <p className="text-sm text-gray-400 text-center">
                      Current: <span className="text-orange-300 font-medium">{currentStatus}</span>
                    </p>
                    
                    <div className="space-y-2">
                      {['LOBBY', 'IN_PROGRESS', 'COMPLETED', 'LOCKED'].map((status) => {
                        const isCurrentStatus = currentStatus === status;
                        const canMakeTransition = canTransition(currentStatus, status);
                        const isDisabled = isCurrentStatus || !canMakeTransition || adminLoading;
                        
                        return (
                          <button
                            key={status}
                            onClick={() => updateRoundStatus(roundNum, status)}
                            disabled={isDisabled}
                            className={`
                              w-full px-3 py-2 text-sm rounded transition-all duration-200
                              ${getStatusButtonColor(currentStatus, status)}
                              ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
                              text-white font-medium
                            `}
                          >
                            {status.replace('_', ' ')}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* NEW: Automated R3 Qualification Card */}
            <div className="mt-6 bg-gray-800/80 border border-orange-500/30 rounded-lg p-5">
              <h4 className="text-orange-400 font-bold mb-3 text-lg">Automate R3 Qualification</h4>
              <p className="text-sm text-gray-300 mb-4">
                Enter the number of top players to automatically qualify based on their current event score.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    Number of Top Players (X)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={qualifyCount}
                    onChange={(e) => setQualifyCount(e.target.value ? parseInt(e.target.value) : '')}
                    className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-orange-500 transition-colors"
                    placeholder="e.g., 40"
                  />
                </div>
                <button
                  onClick={handleQualifyR3}
                  disabled={isQualifying || !qualifyCount}
                  className={`px-6 py-2 rounded font-medium transition-all duration-200 whitespace-nowrap
                    ${isQualifying || !qualifyCount
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-orange-600 text-white hover:bg-orange-500 hover:scale-105 shadow-lg shadow-orange-500/20'
                    }
                  `}
                >
                  {isQualifying ? 'Processing...' : 'Qualify Players'}
                </button>
              </div>
            </div>
            <div className="mt-6 text-sm text-gray-400 bg-gray-800/50 rounded-lg p-4">
              <h4 className="text-orange-400 font-medium mb-2">Status Transitions:</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <p className="text-white">• LOCKED → LOBBY: Open for joining</p>
                <p className="text-white">• LOBBY → IN_PROGRESS: Start round</p>
                <p className="text-white">• IN_PROGRESS → COMPLETED: End round</p>
              </div>
            </div>
          </div>
        </div>
      )}


    </>

  )

};