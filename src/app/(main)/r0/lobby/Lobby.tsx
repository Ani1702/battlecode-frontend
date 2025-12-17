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

// // --- TYPE DEFINITIONS ---

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
//   problems?: unknown[];
//   startTime?: number;
//   duration?: number;
//   [key: string]: unknown;
// }

// interface GameStateData {
//   success: boolean;
//   timeRemaining?: number;
//   problems?: unknown[];
//   duration?: number;
//   [key: string]: unknown;
// }

// interface JoinResponse {
//     success: boolean;
//     error?: string;
// }

// interface TimerData {
//   timeRemaining?: number;
// }

// interface ErrorData {
//   message?: string;
//   [key: string]: unknown;
// }

// // --- COMPONENT ---

// export default function Lobbyr0() {
//   const router = useRouter();
//   const { socket, isConnected } = useSocket();
//   const { user, userId, isLoading: authLoading, userRole } = useAuth();

//   const [participants, setParticipants] = useState<Participant[]>([]);
//   const [isRoundActive, setIsRoundActive] = useState(false);
//   const [timeRemaining, setTimeRemaining] = useState(0);
//   const [isLoading, setIsLoading] = useState(true);
//   // const [roundStarted, setRoundStarted] = useState(false);
//   const [hasProcessedConnection, setHasProcessedConnection] = useState(false);
//   const [authenticationChecked, setAuthenticationChecked] = useState(false);
//   const [userHasActiveMatch, setUserHasActiveMatch] = useState(false);
//   const [isRoundJoinable, setIsRoundJoinable] = useState(true); // New state to track if the round is active

//   const isAdmin = userRole === 'ADMIN';

//   // Authentication check useEffect
//   useEffect(() => {
//     if (authLoading) return;
//     setAuthenticationChecked(true);
//     if (!userId || !user) {
//       router.push('/dashboard');
//     }
//   }, [authLoading, userId, user, router]);

//   // useEffect to check for an active match or join the lobby
//   useEffect(() => {
//     if (!authenticationChecked || authLoading || !userId || !user || !socket || !isConnected || hasProcessedConnection) {
//       return;
//     }

//     socket.emit('round0:getState', {}, (data: GameStateData) => {
//       if (data && data.success) {
     
//         setUserHasActiveMatch(true);
//         setIsRoundActive(true);
//         setTimeRemaining(data.timeRemaining || 0);
//       } else {
      
//         socket.emit('round0:join', { userId, username: user?.user_metadata?.full_name || user?.id }, (joinResponse: JoinResponse) => {
//             if (joinResponse && !joinResponse.success) {
//                 console.error("Failed to join lobby:", joinResponse.error);
//                 showErrorToast(joinResponse.error || "Could not join the lobby because it is not active.");
//                 setIsRoundJoinable(false); // Set state to show the "Round not active" message
//             }
//         });
//       }
//       setHasProcessedConnection(true);
//     });

//   }, [socket, isConnected, authenticationChecked, hasProcessedConnection, userId, user, authLoading]);


//   // Main Socket event listeners useEffect
//   useEffect(() => {
//     if (!socket) return;

//     const handleLobbyUpdate = (lobbyData: LobbyData) => {
//       setIsLoading(false);
//       if (lobbyData.participants) {
//         const participantsArray = Array.isArray(lobbyData.participants)
//           ? lobbyData.participants
//           : Object.values(lobbyData.participants);
//         setParticipants(participantsArray);
//       }
//     };

//     const handleRoundStart = (data: RoundStartData) => {
 
      
//       if (data && typeof data === 'object' && data.problems && data.startTime) {
//         try {
//           const dataToStore = {
//             problems: data.problems,
//             startTime: data.startTime,
//             duration: data.duration || 1200
//           };
//           sessionStorage.setItem('round0_data', JSON.stringify(dataToStore));
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

//       // setRoundStarted(true);
//       setIsRoundActive(true);
//       showSuccessToast('Round 0 has started! Redirecting...');

//       setTimeout(() => {
//         router.push('/r0/code');
//       }, 1500);
//     };

//     const handleTimer = (data: TimerData) => setTimeRemaining(data.timeRemaining || 0);
//     const handleRoundEnd = () => router.push('/dashboard');
//     const handleError = (error: ErrorData) => {
//       const errorMessage = typeof error === 'string' ? error : error?.message || 'An error occurred';
//       showErrorToast(errorMessage);
//     };

//     socket.on('lobby:round0', handleLobbyUpdate);
//     socket.on('round0:start', handleRoundStart);
//     socket.on('round0:timer', handleTimer);
//     socket.on('round0:end', handleRoundEnd);
//     socket.on('round0:error', handleError);

//     return () => {
//       socket.off('lobby:round0', handleLobbyUpdate);
//       socket.off('round0:start', handleRoundStart);
//       socket.off('round0:timer', handleTimer);
//       socket.off('round0:end', handleRoundEnd);
//       socket.off('round0:error', handleError);
//     };
//   }, [socket, router]);

//   const handleStartRound = () => {
//     if (!socket || participants.length === 0) return;
//     localStorage.removeItem(`battlecode-round-0-code-store`);
//     socket.emit('round0:ready');
//   };

//   const handleReturnToMatch = () => router.push('/r0/code');
//   const formatTime = (seconds: number) => new Date(seconds * 1000).toISOString().substr(14, 5);

//   if (authLoading || !authenticationChecked) {
//     return (
//       <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
//         <div className="text-center">
//           <div className="mb-4 flex justify-center">
//             <Image src="/battlecode_logo.png" alt="Loading..." className="h-50 w-fit animate-pulse" width={200} height={50} />
//           </div>
//           <p className="text-gray-400">Loading...</p>
//         </div>
//       </div>
//     );
//   }

//   // Render this UI if the server confirms the round is not joinable
//   if (!isRoundJoinable) {
//     return (
//       <div className="flex flex-col items-center justify-center h-screen bg-[url('/r0_lobby_bg.svg')] bg-center bg-cover">
//         <div className="bg-black/70 p-8 rounded-lg border border-red-500 text-center backdrop-blur-sm">
//           <h2 className="text-2xl text-red-400 mb-4 orbitron">Round 0 Is Not Active</h2>
//           <p className="text-gray-300 mb-6">You cannot join the lobby at this time. Please check back later.</p>
//           <button
//             onClick={() => router.push('/dashboard')}
//             className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-lg shadow-lg hover:scale-105 transition-all"
//           >
//             Return to Dashboard
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="flex flex-col bg-[url('/r0_lobby_bg.svg')] bg-center bg-cover h-screen">
//       <div className="flex-shrink-0 orbitron items-center flex flex-col text-7xl" style={{ textShadow: '0 0 10px rgba(217, 119, 6, 1)' }}>
//         <p className='flex-1 flex items-end pt-8'> <span className="text-white">ROUND</span> <span className="text-orange-500">&nbsp; 0</span></p>
//         <span className="text-orange-500 text-2xl pb-4">LOBBY</span>
//       </div>

//       <div className='flex-shrink-0 text-2xl orbitron ml-40 pb-4 text-white'>
//         Participants: {participants.length}
//       </div>

//       <div className="flex-1 p-6 min-h-0">
//         <CustomScrollbar className="h-full overflow-y-auto">
//           <div className="grid grid-cols-4 gap-12 max-w-6xl mx-auto pb-6">
//             {isLoading ? (
//               Array.from({ length: 8 }).map((_, index) => (
//                 <div key={index} className="relative w-full h-[90px] mb-3">
//                   <div className="absolute inset-0 w-full h-full bg-gray-800/50 animate-pulse rounded-lg"></div>
//                 </div>
//               ))
//             ) : participants.length > 0 ? (
//               participants.map((participant) => (
//                 <PlayerCard
//                   key={participant.userId}
//                   username={participant.username}
//                   avatar={`https://ui-avatars.com/api/?name=${encodeURIComponent(participant.username)}&background=ea580c&color=fff`}
//                 />
//               ))
//             ) : (
//               <div className="col-span-4 flex items-center justify-center text-gray-400 text-base py-12">
//                 {!hasProcessedConnection ? "Connecting to lobby..." : "No participants yet. Waiting for players to join..."}
//               </div>
//             )}
//           </div>
//         </CustomScrollbar>
//       </div>

//       {/* --- BOTTOM STATUS AND CONTROLS SECTION --- */}
//       <div className="flex-shrink-0 p-4 flex flex-col items-center gap-3 min-h-[110px]">
        
//         {/* State 1: User has an active match to rejoin */}
//         {userHasActiveMatch && (
//           <div className="flex flex-col items-center gap-2">
//             <div className="text-base text-center text-green-400">You have an active match in progress!</div>
//             <div className="text-gray-200 text-center text-sm">
//               <p className="text-orange-400 font-bold mt-1">Time Remaining: {formatTime(timeRemaining)}</p>
//               <button
//                 onClick={handleReturnToMatch}
//                 className="mt-4 px-6 py-2 bg-gradient-to-r from-green-500 to-teal-600 text-white font-bold rounded-lg shadow-lg hover:scale-105 transition-all duration-300 text-lg flex items-center gap-2"
//               >
//                 <Rocket className="h-5 w-5" />
//                 Return to Match
//               </button>
//             </div>
//           </div>
//         )}

//         {/* State 2: Round just started for users in the lobby */}
//         {isRoundActive && !userHasActiveMatch && (
//             <div className="flex flex-col items-center gap-2">
//                 <div className="text-base text-center text-green-400">Round 0 Started!</div>
//                 <div className="text-gray-200 text-center text-sm">
//                 <p>Redirecting to coding environment...</p>
//                 <div className="flex justify-center items-center gap-2 mt-2">
//                     <div className="bg-green-500 rounded-full h-2 w-2 animate-pulse"></div>
//                     <div className="bg-green-500 rounded-full h-2 w-2 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
//                     <div className="bg-green-500 rounded-full h-2 w-2 animate-pulse" style={{ animationDelay: '1s' }}></div>
//                 </div>
//                 </div>
//             </div>
//         )}

//         {/* State 3: Lobby is in a waiting state before the round begins */}
//         {!isRoundActive && (
//           <>
//             <div className="text-sm text-gray-200 text-center">
//               {!isConnected ? (
//                   <p className="text-red-400">Connecting to server...</p>
//               ) : !hasProcessedConnection ? (
//                   <p className="text-blue-400">Checking status...</p>
//               ) : (
//                   <p className="text-green-400">Connected to lobby. Waiting for participants...</p>
//               )}
//             </div>

//             {isAdmin && isConnected && hasProcessedConnection && participants.length > 0 && (
//               <button
//                 onClick={handleStartRound}
//                 className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-lg shadow-lg hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm flex items-center gap-2"
//                 disabled={isLoading}
//               >
//                 <Rocket className="h-4 w-4" />
//                 Start Round 0
//               </button>
//             )}
//           </>
//         )}
//       </div>
//     </div>
//   );
// }