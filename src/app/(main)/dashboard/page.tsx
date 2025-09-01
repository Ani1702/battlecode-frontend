"use client"
import ContributionsGrid from "@/components/shared/ContributionsGrid";
import Rewards from "@/components/shared/Rewards";
import Navbar from "@/components/shared/Navbar";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { useRouter } from "next/navigation";
import SignOut from "@/components/auth/SignOut"

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
  const { user } = useAuth();
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

  // Load data from localStorage after hydration
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
  
  const titles = ["Qualifier", "Head to Head", "Elite Bounties", "The Final Hack"];
  const leaderboard_titles = ["Rank", "Player", "Score", "Trend"];

  // Socket event handlers
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
  }, [socket, isConnected]);

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
      <div className="bg-[url('/bg-dashboard.svg')] min-h-screen bg-cover bg-center">
        <div className="h-screen w-full flex">
          <div className="flex-[1.5]  h-full w-full flex flex-col">
            <div className="flex-1 ml-3 mt-3 orbitron flex justify-between">
              <p className = "flex-1">{"<> BattleCode Arena"}</p>
              <div className= " flex-1 ">
              <SignOut />

              </div>
              

            </div>
            <div className="flex-1  font-medium text-lg orbitron">
              <p className="text-5xl pl-8 orbitron">Competition<span className="text-5xl text-amber-700 oxanium orbitron"> Rounds</span></p>


            </div>
            {[0, 1, 2, 3].map((i) => {
              const isCurrentRound = currentRoundData?.currentRoundNumber === i;
              const roundStatus = currentRoundData?.rounds.find(r => r.roundNumber === i);
              const isActive = roundStatus?.isActive || false;
              const locked = islocked[i];
              
              return (
                <div className={`flex-[1.2] flex justify-center items-center pb-5  `} key={i}>
                  <div
                    className={`w-[95%] h-[90%] rounded-2xl flex glass-box justify-center ${
                      locked 
                        ? "!border-gray-400/50 !border-2" 
                        : "!border-amber-600 !border-2"
                    } items-center pl-5 transition-transform duration-200 ${
                      !locked ? ' hover:-translate-y-2 cursor-pointer ' : 'cursor-not-allowed opacity-60'
                    }`}
                    role="button"
                    tabIndex={0}
                    aria-disabled={locked}
                    onClick={() => {
                      if (!locked) router.push(`r${i}/rules`);
                    }}
                  >
                    <div className={`rounded-[50%] h-15 w-15 ml-1 ${
                      locked 
                        ? "border-gray-400/50" 
                        : "border-amber-600"
                    } m-1 items-center justify-center flex border-4`}>
                      <p className={`text-3xl oxanium ${
                        locked 
                          ? "text-gray-400/50" 
                          : ""
                      }`}>{i}</p>
                    </div>
                    <div className="flex-5 flex flex-col ml-5">
                      <div className={`flex-2 text-3xl font-medium ${
                        locked 
                          ? "text-gray-400/50" 
                          : ""
                      }`}>
                        <p>{titles[i]}</p>
                      </div>
                      <div className={`flex-1 ${
                        locked 
                          ? "text-gray-400/50" 
                          : ""
                      }`}>
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
            <div className="flex-2 justify-center items-center flex">
              {/* Debug info and manual refresh */}
              <div className="text-xs text-gray-500 text-center space-y-2">
                {currentRoundData && (
                  <div>
                    <p>Current Round: {currentRoundData.currentRoundNumber} ({currentRoundData.currentRoundStatus})</p>
                    <p>Connected Users: {leaderboard.length}</p>
                  </div>
                )}
                <div className="space-x-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    isConnected 
                      ? 'bg-green-500/20 text-green-400' 
                      : hasConnectedOnce 
                        ? 'bg-yellow-500/20 text-yellow-400' 
                        : 'bg-red-500/20 text-red-400'
                  }`}>
                    Socket: {
                      isConnected 
                        ? 'Connected' 
                        : hasConnectedOnce 
                          ? 'Reconnecting...' 
                          : 'Connecting...'
                    }
                  </span>
                  {socket && isConnected && (
                    <button 
                      onClick={() => {
                        console.log("Manual refresh requested");
                        socket.emit("client:getLeaderboard");
                        socket.emit("client:getCurrentRound");
                      }}
                      className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition"
                    >
                      Refresh Data
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1  h-full w-full flex justify-center items-end ">
            <div className="w-[95%] h-[85%] rounded-lg border-2 mb-4 flex flex-col glass-box">
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
              <div className="flex-7 overflow-y-auto px-4 pb-4">
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
              </div>


            </div>

          </div>

        </div>
      </div>
    </>

  )

};