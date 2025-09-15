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
  const { user, session, isLoading, userRole, /*username*/ } = useAuth();
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
      console.log("Session exists but user verification in progress...");
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
      console.log("🎉 User successfully authenticated, showing login toast");
      showSuccessToast("Successfully logged in");
      setHasShownLoginToast(true);
      
      // Check if user is admin
      setIsAdmin(userRole === 'ADMIN');
    }
    if (prevUser && !user && !isLoading) {
      console.log("🔄 User signed out, resetting toast flag");
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
      console.log("❌ Socket not ready", { hasSocket: !!socket, isConnected });
      return;
    }

    console.log("✅ Socket is ready, setting up event listeners");

    // Listen for leaderboard updates
    const handleLeaderboard = (data: { leaderboard: LeaderboardEntry[] }) => {
      console.log("📊 Received leaderboard update:", data);
      setLeaderboard(data.leaderboard);
      // Persist to localStorage
      if (isClient) {
        localStorage.setItem('battlecode_leaderboard', JSON.stringify(data.leaderboard));
      }
    };

    // Listen for current round updates
    const handleCurrentRound = (data: CurrentRoundData) => {
      console.log("🎮 Received current round update:", data);
      setCurrentRoundData(data);

      // Update locked status based on round data
      const newLockedStatus = [true, true, true, true];
      data.rounds.forEach((round) => {
        if (round.roundNumber >= 0 && round.roundNumber <= 3) {
          newLockedStatus[round.roundNumber] = round.isLocked;
        }
      });
      console.log("🔒 Updated lock status:", newLockedStatus);
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
    console.log("📡 Requesting initial data from socket...");
    socket.emit("client:join");




    socket.emit("client:getLeaderboard");
    socket.emit("client:getCurrentRound");

    // Cleanup function
    return () => {
      console.log("🧹 Cleaning up socket event listeners");
      socket.off("server:leaderboard", handleLeaderboard);
      socket.off("server:currentRound", handleCurrentRound);
    };
  }, [socket, isConnected, isClient]);

  // Constants (after all hooks)
  const titles = ["Qualifier", "Head to Head", "Elite Bounties", "The Final Hack"];
  const leaderboard_titles = ["Rank", "Player", "Score", "Trend"];

  // Admin functions
  const updateRoundStatus = async (roundNumber: number, newStatus: string) => {
    if (!isAdmin || adminLoading) return;

    setAdminLoading(true);
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
      'LOBBY': 'bg-blue-600 hover:bg-blue-500',
      'IN_PROGRESS': 'bg-green-600 hover:bg-green-500',
      'COMPLETED': 'bg-purple-600 hover:bg-purple-500'
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
      <div className="bg-[url('/bg-dashboard.svg')] min-h-screen bg-cover bg-center flex flex-col relative">
        {/* Loading/Authentication Overlay */}
        {(isLoading || !user || !session) && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="text-center justify-center items-center">
              <div className="mb-4 flex items-center justify-center">
                <img src="/battlecode_logo.png" alt="Loading..." className="flex h-50 w-fit animate-pulse" />
              </div>
              <p className="text-gray-400">
                {isLoading ? "Verifying authentication..." : "Redirecting..."}
              </p>
            </div>
          </div>
        )}
        <div className="flex-[2] ">
          <div className = " h-15">
          <div className="flex-1 ml-3  orbitron flex justify-start items-start">
            <p className="flex-1 mt-2">{"<> BattleCode Arena"}</p>
            <div className="flex-1 flex justify-end mr-8 mt-2">
              <SignOut />
            </div>
          </div>
          </div>
        </div>
        <div className="flex-6  flex ">
          <div className="flex-[1.5] flex flex-col ">
            <div className="flex-[0.5] flex flex-col ml-5 justify-center">
              <h1 className="text-5xl  text-white  flex-[0.2] flex justify-start items-center">
                <p className = "font-bold">Welcome </p>
                <span className="text-orange-500  text-5xl ml-2">
                  {user?.email?.split('@')[0] || 'Warrior'}
                </span>
                
              </h1>
              {/* <p className ="flex-[1] flex ">
                
                

              </p> */}
              
            </div>
            <div className = "flex-[0.8] ml-5 mt-3 text-4xl flex justify-start items-center orbitron"> Challenger Rounds</div>
            <div className="flex-4 ">
              {[0, 1, 2, 3].map((i) => {
                /*const isCurrentRound = currentRoundData?.currentRoundNumber === i;*/
                const roundStatus = currentRoundData?.rounds.find(r => r.roundNumber === i);
                const isActive = roundStatus?.isActive || false;
                const locked = islocked[i];

                return (
                  <div className={`flex-[1.2] flex justify-center items-center pb-5 `} key={i}>
                    <div
                      className={`w-[95%] h-[90%] rounded-2xl flex glass-box justify-center ${locked
                        ? "!border-gray-400/50 !border-2"
                        : "!border-amber-600 !border-2"
                        } items-center pl-5 transition-transform duration-200 ${!locked ? ' hover:-translate-y-2 cursor-pointer ' : 'cursor-not-allowed opacity-60'
                        }`}
                      role="button"
                      tabIndex={0}
                      aria-disabled={locked}
                      onClick={() => {
                        if (!locked) router.push(`r${i}/rules`);
                      }}
                    >
                      <div className={`rounded-[50%] h-15 w-15 ml-1 ${locked
                        ? "border-gray-400/50"
                        : "border-amber-600"
                        } m-1 items-center justify-center flex border-4`}>
                        <p className={`text-3xl oxanium ${locked
                          ? "text-gray-400/50"
                          : ""
                          }`}>{i}</p>
                      </div>
                      <div className="flex-5 flex flex-col ml-5">
                        <div className={`flex-2  p-3 ${locked
                          ? "text-gray-400/50"
                          : ""
                          }`}>
                          <p className="text-3xl font-medium">{titles[i]}</p>
                          <p>
                            {locked
                              ? "Locked"
                              : isActive
                                ? "Active"
                                : roundStatus?.status === "LOBBY"
                                  ? "Starting Soon"
                                  : "Available"}
                          </p>
                        </div>
                        
                        <div className={`flex-1 ${locked
                          ? "text-gray-400/50"
                          : ""
                          }`}>
                          
                        </div>
                      </div>
                      <div className={`flex-[0.5] flex justify-center items-center`}>
                        {locked ? (
                          <img src="/lock.svg" alt="Locked" />
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
          <div className="flex-1 ">


            <div className="w-[95%] h-[95%] rounded-lg border-2 mb-4 flex flex-col glass-box">

              <div className="flex-1  justify-center items-center flex">


                <img src="/leaderboard-img.svg" className="w-4 h-4 mr-2" /><span></span>
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
              <CustomScrollbar className="flex-7 overflow-y-auto px-4 pb-4">
                <table className="min-w-full text-left text-sm  text-white">
                  <thead>
                    <tr className="border-b border-gray-700">
                      {leaderboard_titles.map((title, idx) => (
                        <th key={idx} className="py-2 px-3 font-bold">{title}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.length > 0 ? (
                      // Display real leaderboard data from socket or localStorage
                      leaderboard.map((entry, idx) => (
                        <tr key={entry.id || idx} className="border-gray-800 hover:bg-white/5 transition">
                          <td className="py-2 px-3">{entry.rank}</td>
                          <td className="py-2 px-3">
                            <div className="flex flex-col">
                              <span className="font-medium">{entry.username !== 'Not Set' ? entry.username : entry.name}</span>
                              {entry.username !== 'Not Set' && entry.name && (
                                <span className="text-xs text-gray-400">{entry.name}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3">{entry.score}</td>
                          <td className="py-2 px-3">{entry.trend}</td>
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
                            <td key={cidx} className="py-2 px-3">{cell}</td>
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

      {/* Admin Controls - Positioned after 100vh */}
      {isAdmin && (
        <div className="min-h-screen w-full bg-[url('/bg-dashboard.svg')] bg-cover bg-center flex items-center justify-center px-5">
          <div className="w-full max-w-6xl rounded-lg border-2 border-orange-500/50 glass-box p-6">
            <div className="flex items-center mb-6">
              <div className="w-4 h-4 bg-orange-500 rounded-full mr-3"></div>
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
            
            <div className="mt-6 text-sm text-gray-400 bg-gray-800/50 rounded-lg p-4">
              <h4 className="text-orange-400 font-medium mb-2">Status Transitions:</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <p>• LOCKED → LOBBY: Open for joining</p>
                <p>• LOBBY → IN_PROGRESS: Start round</p>
                <p>• IN_PROGRESS → COMPLETED: End round</p>
              </div>
            </div>
          </div>
        </div>
      )}


    </>

  )

};