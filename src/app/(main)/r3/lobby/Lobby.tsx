// "use client";
// import { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import Image from "next/image";
// import { Rocket } from "lucide-react";
// import PlayerCard from '@/components/shared/PlayerCard';
// import CustomScrollbar from '@/components/shared/CustomScrollbar';
// import { useSocket } from '@/contexts/SocketContext';
// import { useAuth } from '@/contexts/AuthContext';
// import { showSuccessToast, showErrorToast } from '@/components/shared/CustomToast';

// interface Participant {
//   userId: string;
//   username: string;
//   status: 'WAITING' | 'IN_MATCH' | 'DISCONNECTED' | 'FINISHED';
//   joinedAt: string;
//   isReady: boolean;
//   disconnectedAt?: string;
//   reconnectedAt?: string;
//   finishedAt?: string;
// }

// interface LobbyData {
//   participants?: Record<string, Participant>;
//   [key: string]: unknown;
// }

// interface RoundStartData {
//   questions?: unknown[];
//   startTime?: number;
//   duration?: number;
//   [key: string]: unknown;
// }

// interface TimerData {
//   timeRemaining?: number;
// }

// interface ErrorData {
//   message?: string;
//   [key: string]: unknown;
// }

// export default function Lobbyr0() {
//   const router = useRouter();
//   const { socket, isConnected } = useSocket();
//   const { user, userId, userRole, isLoading: authLoading } = useAuth();

//   const [participants, setParticipants] = useState<Participant[]>([]);
//   const [isRoundActive, setIsRoundActive] = useState(false);
//   const [timeRemaining, setTimeRemaining] = useState(0);
//   const [isLoading, setIsLoading] = useState(true);
//   const [roundStarted, setRoundStarted] = useState(false);
//   const [hasJoinedLobby, setHasJoinedLobby] = useState(false);
//   const [authenticationChecked, setAuthenticationChecked] = useState(false);

//   const isAdmin = userRole === "ADMIN";

//   // Authentication and Lobby Join useEffects remain the same...
//   useEffect(() => {
//     if (authLoading) return;
//     setAuthenticationChecked(true);
//     if (!userId || !user) {
//       router.push('/dashboard');
//     }
//   }, [authLoading, userId, user, router]);

//   useEffect(() => {
//     if (!authenticationChecked || authLoading || !userId || !user || !socket || !isConnected || hasJoinedLobby) {
//       return;
//     }
//     socket.emit('round3:join', { userId, username: user?.user_metadata?.full_name || user?.id });
//     setHasJoinedLobby(true);
//   }, [socket, isConnected, authenticationChecked, hasJoinedLobby, userId, user, authLoading]);

//   // Main Socket event listeners useEffect
//   useEffect(() => {
//     if (!socket) return;

//     const handleLobbyUpdate = (lobbyData: LobbyData) => {
//       setIsLoading(false);
//       if (lobbyData.participants) {
//         setParticipants(Object.values(lobbyData.participants));
//       }
//     };

//     const handleRoundStart = (data: RoundStartData) => {
//       console.log('Round 3 started! Data received:', data);
//       if (data && typeof data === 'object' && data.questions && data.startTime) {
//         try {
//           const dataToStore = {
//             problems: data.questions,
//             startTime: data.startTime,
//             duration: data.duration || 1200
//           };
//           sessionStorage.setItem('round3_data', JSON.stringify(dataToStore));
//           console.log('Stored round data in sessionStorage:', dataToStore);
//         } catch (error) {
//           console.error("Failed to save round data to sessionStorage:", error);
//           showErrorToast("Error preparing round. Please try again.");
//           return;
//         }
//       } else {
//         console.error("Invalid round start data received:", data);
//         showErrorToast("Invalid round data received. Please try again.");
//         return;
//       }

//       setRoundStarted(true);
//       setIsRoundActive(true);
//       showSuccessToast('Round 3 has started! Redirecting...');

//       setTimeout(() => {
//         router.push('/r3/code');
//       }, 1500);
//     };

//     const handleTimer = (data: TimerData) => setTimeRemaining(data.timeRemaining || 0);
//     const handleRoundEnd = () => router.push('/dashboard');
//     const handleError = (error: ErrorData) => {
//       const errorMessage = typeof error === 'string' ? error : error?.message || 'An error occurred';
//       showErrorToast(errorMessage);
//     };

//     socket.on('lobby:round3', handleLobbyUpdate);
//     socket.on('round3:start', handleRoundStart);
//     socket.on('round3:timer', handleTimer);
//     socket.on('round3:end', handleRoundEnd);
//     socket.on('round3:error', handleError);

//     return () => {
//       socket.off('lobby:round3', handleLobbyUpdate);
//       socket.off('round3:start', handleRoundStart);
//       socket.off('round3:timer', handleTimer);
//       socket.off('round3:end', handleRoundEnd);
//       socket.off('round3:error', handleError);
//     };
//   }, [socket, router]);

//   // **** FIXED FUNCTION ****
//   const handleStartRound = () => {
//     if (!socket || participants.length === 0) {
//         showErrorToast("Cannot start round without participants.");
//         return;
//     }
//     localStorage.removeItem('battlecode-round-3-code-store');
    
//     console.log("Emitting round3:ready to server...");
//     // Use a callback to get a response from the server
//     socket.emit('round3:ready', {}, (response: { success: boolean; message?: string; error?: string }) => {
//       console.log("Server response from round3:ready:", response);
//       if (response && response.success) {
//         showSuccessToast(response.message || "Round start initiated!");
//         // The 'round3:start' event listener will handle UI changes and redirection
//       } else {
//         showErrorToast(response.error || "Failed to start round.");
//       }
//     });
//   };
 

//   const handleJoinRound = () => router.push('/r3/code');
//   const formatTime = (seconds: number) => new Date(seconds * 1000).toISOString().substr(14, 5);

//   if (authLoading || !authenticationChecked) {
//     return (
//       <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
//         <div className="text-center justify-center items-center">
//           <div className="mb-4 flex items-center justify-center">
//             <Image src="/battlecode_logo.png" alt="Loading..." className="flex h-50 w-fit animate-pulse" width={200} height={50} />
//           </div>
//           <p className="text-gray-400">
//             {isLoading ? "Loading..." : "Redirecting..."}
//           </p>
//         </div>
//       </div>);
//   }

//   // --- JSX ---
//   return (
//     <>
//       <div className="flex flex-col bg-[url('/r0_lobby_bg.svg')] bg-center bg-cover h-screen">
//         <div className="flex-shrink-0 orbitron items-center flex flex-col text-7xl" style={{ textShadow: '0 0 10px rgba(217, 119, 6, 1)' }}>
//           <p className='flex-1 flex items-end pt-8'> <span className="text-white">ROUND</span> <span className="text-orange-500">&nbsp; 3</span></p>
//           <span className="text-orange-500 text-2xl pb-4">LOBBY</span>

          
          

//           {(roundStarted || isRoundActive) && (
//             <div className="mt-3 flex flex-col items-center gap-2">
//               {roundStarted ? (
//                 <>
//                   <div className="text-base text-center text-green-400">Round 3 Started!</div>
//                   <div className="text-gray-200 text-center text-sm">
//                     <p>Redirecting to coding environment...</p>
//                     <div className="flex justify-center items-center gap-2 mt-2">
//                       <div className="bg-green-500 rounded-full h-2 w-2 animate-pulse"></div>
//                       <div className="bg-green-500 rounded-full h-2 w-2 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
//                       <div className="bg-green-500 rounded-full h-2 w-2 animate-pulse" style={{ animationDelay: '1s' }}></div>
//                     </div>
//                   </div>
//                 </>
//               ) : (
//                 <>
//                   <div className="text-base text-center text-green-400">Round 3 Active</div>
//                   <div className="text-gray-200 text-center text-sm">
//                     <p>Round is currently in progress</p>
//                     <p className="text-orange-400 font-bold mt-1">Time Remaining: {formatTime(timeRemaining)}</p>
//                     <button
//                       onClick={handleJoinRound}
//                       className="mt-2 px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded text-sm"
//                     >
//                       Join Round
//                     </button>
//                   </div>
//                 </>
//               )}
//             </div>
//           )}
//         </div>

//         <div className='flex-shrink-0 text-2xl orbitron ml-40 pb-4 text-white'>
//           Participants: {participants.length}
//         </div>

//         <div className="flex-1 p-6 min-h-0">
//           <CustomScrollbar className="h-full overflow-y-auto">
//             <div className="grid grid-cols-4 gap-12 max-w-6xl mx-auto pb-6">
//               {isLoading ? (
//                 Array.from({ length: 10 }).map((_, index) => (
//                   <div key={index} className="relative w-full h-[90px] mb-3">
//                     <div className="absolute inset-0 w-full h-full bg-gray-800/50 animate-pulse rounded-lg"></div>
//                   </div>
//                 ))
//               ) : participants.length > 0 ? (
//                 participants.map((participant) => (
//                   <PlayerCard
//                     key={participant.userId}
//                     username={participant.username}
//                     avatar={`https://ui-avatars.com/api/?name=${encodeURIComponent(participant.username)}&background=ea580c&color=fff`}
//                   />
//                 ))
//               ) : (
//                 <div className="col-span-3 flex items-center justify-center text-gray-400 text-base py-12">
//                   No participants yet. Waiting for players to join...
//                 </div>
//               )}
//             </div>
//           </CustomScrollbar>
//         </div>

//         {!isRoundActive && !roundStarted && (
//           <div className="flex-shrink-0 p-4 flex flex-col items-center gap-3">
//             <div className="text-sm text-gray-200 text-center">
//               {!isConnected ? (
//                 <div>
//                   <p className="text-red-400">Connecting to server...</p>
//                   <div className="flex justify-center items-center gap-2 mt-2">
//                     <div className="bg-red-500 rounded-full h-2 w-2 animate-pulse"></div>
//                     <div className="bg-red-500 rounded-full h-2 w-2 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
//                     <div className="bg-red-500 rounded-full h-2 w-2 animate-pulse" style={{ animationDelay: '1s' }}></div>
//                   </div>
//                 </div>
//               ) : participants.length > 0 ? (
//                 <div>
//                   <p className="text-green-400">Connected to lobby. Waiting for more participants...</p>
//                   {!isLoading && (
//                     <div className="flex justify-center items-center gap-2 mt-2">
//                       <div className="bg-green-500 rounded-full h-2 w-2 animate-pulse"></div>
//                       <div className="bg-green-500 rounded-full h-2 w-2 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
//                       <div className="bg-green-500 rounded-full h-2 w-2 animate-pulse" style={{ animationDelay: '1s' }}></div>
//                     </div>
//                   )}
//                 </div>
//               ) : isLoading ? (
//                 <div>
//                   <p className="text-blue-400">Joining lobby...</p>
//                   <div className="flex justify-center items-center gap-2 mt-2">
//                     <div className="bg-blue-500 rounded-full h-2 w-2 animate-pulse"></div>
//                     <div className="bg-blue-500 rounded-full h-2 w-2 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
//                     <div className="bg-blue-500 rounded-full h-2 w-2 animate-pulse" style={{ animationDelay: '1s' }}></div>
//                   </div>
//                 </div>
//               ) : (
//                 <div>
//                   <p className="text-green-400">Connected. Waiting for participants to join...</p>
//                   <div className="flex justify-center items-center gap-2 mt-2">
//                     <div className="bg-orange-500 rounded-full h-2 w-2 animate-pulse"></div>
//                     <div className="bg-orange-500 rounded-full h-2 w-2 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
//                     <div className="bg-orange-500 rounded-full h-2 w-2 animate-pulse" style={{ animationDelay: '1s' }}></div>
//                   </div>
//                 </div>
//               )}
//             </div>

//             {isAdmin && !isLoading && participants.length > 0 && (
//               <button
//                 onClick={handleStartRound}
//                 className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-lg shadow-lg hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm flex items-center gap-2"
//                 disabled={isLoading}
//               >
//                 <Rocket className="h-4 w-4" />
//                 Start Round 3 (All users are admin for testing)
//               </button>
//             )}
//           </div>
//         )}
//       </div>
//     </>
//   );
// }