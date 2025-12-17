// "use client";
// import { useState, useEffect } from 'react';
// import Image from 'next/image';
// import { useRouter } from 'next/navigation';
// import { useSocket } from '@/contexts/SocketContext';
// import { showSuccessToast, showErrorToast, showInfoToast } from '@/components/shared/CustomToast';
// import CustomScrollbar from '@/components/shared/CustomScrollbar';
// import ChallengerPlayerCard from '@/components/shared/ChallengerPlayerCard';
// import BountyQuestionCard, { BountyQuestion } from '@/components/shared/BountyQuestionCard';

// // --- Interfaces ---
// interface Participant {
//   id: string;
//   username: string;
//   status: string;
//   role?: 'elite' | 'challenger';
// }

// interface SimpleSocketResponse {
//     success: boolean;
//     message?: string;
// }

// interface SocketStateResponse {
//     success: boolean;
//     state: {
//         userRole?: 'challenger' | 'elite' | null;
//         activeSession?: { type: 'match' | 'bounty', contextId: string } | null;
//     };
// }

// interface ServerBountyQuestion extends Omit<BountyQuestion, 'name'> {
//     title: string;
//     isSolvedByAnyone?: boolean;
//     isAttemptedByUser?: boolean;
// }

// interface DashboardResponse {
//     success: boolean;
//     message?: string;
//     dashboard: {
//         roundEndTime: number;
//         bountyQuestions: ServerBountyQuestion[];
//         allParticipants: Participant[];
//     };
// }

// const formatTime = (ms: number) => {
//     if (ms <= 0) return "00:00";
//     const totalSeconds = Math.floor(ms / 1000);
//     const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
//     const seconds = (totalSeconds % 60).toString().padStart(2, '0');
//     return `${minutes}:${seconds}`;
// };

// export default function ChallengerDashboard() {
//   const router = useRouter();
//   const { socket, isConnected } = useSocket();

//   const [availableElites, setAvailableElites] = useState<Participant[]>([]);
//   const [bountyQuestions, setBountyQuestions] = useState<BountyQuestion[]>([]);
//   const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());
//   const [timeRemaining, setTimeRemaining] = useState(0);
//   const [roundEndTime, setRoundEndTime] = useState<number | null>(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [isRedirecting, setIsRedirecting] = useState(false); // Safeguard state

//   useEffect(() => {
//     if (!socket || !isConnected) return;

//     socket.emit('round2:getState', (stateResponse: SocketStateResponse) => {
//         if (!stateResponse.success) {
//             showErrorToast("Could not verify state. Redirecting...");
//             router.push('/dashboard');
//             return;
//         }

//         if (stateResponse.state.activeSession) {
//             showInfoToast("Resuming your active session...");
//             try {
//                 sessionStorage.setItem('r2_session_type', stateResponse.state.activeSession.type);
//                 sessionStorage.setItem('r2_context_id', stateResponse.state.activeSession.contextId);
//                 sessionStorage.setItem('r2_user_role', 'challenger');
//                 router.push(`/r2/code`);
//             } catch (error) {
//               console.log(error);
//                 showErrorToast("Could not resume session. Please enable storage.");
//             }
//             return;
//         }

//         if (stateResponse.state.userRole === 'challenger') {
//             socket.emit('round2:getDashboardState', (dashResponse: DashboardResponse) => {
//                 if (dashResponse.success) {
//                     setRoundEndTime(dashResponse.dashboard.roundEndTime);
//                     const transformedBounties = dashResponse.dashboard.bountyQuestions.map((q) => ({
//                         ...q,
//                         name: q.title,
//                     }));
//                     setBountyQuestions(transformedBounties);
//                     const allParticipants = dashResponse.dashboard.allParticipants;
//                     setAvailableElites(allParticipants.filter((p: Participant) => p.role === 'elite' && p.status === 'elite:idle'));
//                 } else {
//                     showErrorToast(dashResponse.message || "Failed to load dashboard.");
//                     router.push('/dashboard');
//                 }
//                 setIsLoading(false);
//             });
//         } else {
//             showErrorToast("Access denied. Redirecting...");
//             router.push(stateResponse.state.userRole ? `/r2/${stateResponse.state.userRole}` : '/dashboard');
//         }
//     });
//   }, [socket, isConnected, router]);

//   // --- MODIFIED: Timer now triggers redirection ---
//   useEffect(() => {
//     if (!roundEndTime || isRedirecting) return;
//     const interval = setInterval(() => {
//         const remaining = roundEndTime - Date.now();
//         setTimeRemaining(Math.max(0, remaining));
//          if (remaining <= 0) {
//             clearInterval(interval);
//             // --- FIX: Redirect when timer hits zero ---
//             if (!isRedirecting) {
//                 setIsRedirecting(true);
//                 showInfoToast("Round 2 has ended. You will be redirected to the dashboard.");
//                 setTimeout(() => {
//                     router.push('/dashboard');
//                 }, 3000);
//             }
//         }
//     }, 1000);
//     return () => clearInterval(interval);
//   }, [roundEndTime, router, isRedirecting]);

//   useEffect(() => {
//     if (!socket) return;

//     const handleLobbyUpdate = (data: { participants: Participant[] }) => {
//         setAvailableElites(data.participants.filter(p => p.role === 'elite' && p.status === 'elite:idle'));
//     };
    
//     const handleRequestFailed = (data: { eliteId: string, reason?: string }) => {
//         showInfoToast(data.reason || `Your challenge was rejected.`);
//         setPendingRequests(prev => {
//             const newSet = new Set(prev);
//             newSet.delete(data.eliteId);
//             return newSet;
//         });
//     };

//     const handleMatchStarted = (data: { matchId: string }) => {
//         showSuccessToast("Match starting! Redirecting...");
//         try {
//             sessionStorage.setItem('r2_session_type', 'match');
//             sessionStorage.setItem('r2_context_id', data.matchId);
//             sessionStorage.setItem('r2_user_role', 'challenger');
//             router.push(`/r2/code`);
//         } catch (error) {
//             console.error("Session storage is unavailable.", error);
//             showErrorToast("Could not save session. Please enable cookies/storage.");
//         }
//     };
    
//     const handleDashboardUpdate = (data: { pendingRequests?: string[] }) => {
//         if (data.pendingRequests) {
//             setPendingRequests(new Set(data.pendingRequests));
//         }
//     };
    
//     const handleRoundEnd = () => {
//         // --- FIX: Use safeguard to prevent double redirection ---
//         if (isRedirecting) return;
//         setIsRedirecting(true);
//         showInfoToast("Round 2 has ended. You will be redirected to the dashboard.");
//         setTimeout(() => {
//             router.push('/dashboard');
//         }, 3000);
//     };

//     socket.on('round2:lobbyUpdate', handleLobbyUpdate);
//     socket.on('round2:challengeRejected', handleRequestFailed);
//     socket.on('round2:challengeExpired', handleRequestFailed);
//     socket.on('round2:matchStarted', handleMatchStarted);
//     socket.on('round2:dashboardUpdate', handleDashboardUpdate);
//     socket.on('round2:ended', handleRoundEnd);

//     return () => {
//       socket.off('round2:lobbyUpdate', handleLobbyUpdate);
//       socket.off('round2:challengeRejected', handleRequestFailed);
//       socket.off('round2:challengeExpired', handleRequestFailed);
//       socket.off('round2:matchStarted', handleMatchStarted);
//       socket.off('round2:dashboardUpdate', handleDashboardUpdate);
//       socket.off('round2:ended', handleRoundEnd);
//     };
//   }, [socket, router, isRedirecting]);
  
//   const handleStartBounty = (questionId: string) => {
//     if (!socket) return;
    
//     socket.emit('round2:bountyBeginQuestion', { questionId }, (response: SimpleSocketResponse) => {
//         if (response.success) {
//             showSuccessToast("Starting bounty... good luck!");
//             try {
//                 sessionStorage.setItem('r2_session_type', 'bounty');
//                 sessionStorage.setItem('r2_context_id', questionId);
//                 sessionStorage.setItem('r2_user_role', 'challenger');
//                 router.push(`/r2/code`);
//             } catch (error) {
//                 console.error("Session storage is unavailable.", error);
//                 showErrorToast("Could not save session. Please enable cookies/storage.");
//             }
//         } else {
//             showErrorToast(response.message || "Could not start bounty.");
//         }
//     });
//   };

//   const handleChallengeElite = (eliteId: string) => {
//     if (!socket) return;
//     setPendingRequests(prev => new Set(prev).add(eliteId));
//     socket.emit('round2:challengeRequest', { eliteId }, (response: SimpleSocketResponse) => {
//         if (response.success) {
//             showSuccessToast("Challenge request sent!");
//         } else {
//             showErrorToast(response.message || "Failed to send challenge.");
//             setPendingRequests(prev => {
//                 const newSet = new Set(prev);
//                 newSet.delete(eliteId);
//                 return newSet;
//             });
//              if (response.message?.includes("active session")) {
//                 router.refresh();
//             }
//         }
//     });
//   };
  
//   if (isLoading) {
//     return <div className="flex items-center justify-center h-screen text-white bg-gray-900">Checking session status...</div>;
//   }

//   return (
//     <div className="flex bg-[url('/elite_bg.svg')] bg-center bg-no-repeat h-screen w-full flex-col overflow-hidden orbitron">
//         <div className="flex-1 flex items-center justify-center text-6xl orbitron white-glow relative">
//             <Image src="/b-2.svg" alt="Battlecode Logo" className="h-20" width={80} height={80}/>
//             CHALLENGER DASHBOARD
//             <div className="absolute top-4 right-4 bg-black/50 text-white text-2xl p-2 px-4 rounded-lg font-mono">
//                 {formatTime(timeRemaining)}
//             </div>
//         </div>
//         <div className="flex-4 flex flex-row">
//           <div className="flex-1">
//             <div className="h-[80%] w-[80%] glass-box rounded-lg m-auto mt-10 p-5">
//               <h2 className="text-2xl font-bold text-white mb-4 ml-4 orbitron">Challenge Elites</h2>
//               <CustomScrollbar className="h-[calc(100%-3rem)] overflow-y-auto overflow-x-hidden pr-2">
//                 {availableElites.length > 0 ? (
//                   availableElites.map((player) => (
//                     <ChallengerPlayerCard
//                       key={player.id}
//                       username={player.username}
//                       onChallenge={() => handleChallengeElite(player.id)}
//                       isPending={pendingRequests.has(player.id)}
//                     />
//                   ))
//                 ) : (
//                   <div className="text-center text-gray-400 mt-8">
//                     <p className="text-lg">No elites are available</p>
//                     <p className="text-sm">All elites are currently in a match. Check back soon!</p>
//                   </div>
//                 )}
//               </CustomScrollbar>
//             </div>
//           </div>
//           <div className="flex-1">
//             <div className="h-[80%] w-[80%] glass-box rounded-lg m-auto mt-10 p-5">
//               <h2 className="text-2xl font-bold text-white mb-4 orbitron">Bounty Questions</h2>
//               <CustomScrollbar className="h-[calc(100%-3rem)] overflow-y-auto pr-2">
//                 <div className="grid grid-cols-4 gap-2">
//                   {bountyQuestions.map((question, index) => (
//                       <BountyQuestionCard
//                         key={question.id}
//                         question={question}
//                         onSolve={() => handleStartBounty(question.id)}
//                         questionIndex = {index}
//                       />
//                     ))}
//                 </div>
//               </CustomScrollbar>
//             </div>
//           </div>
//         </div>
//       </div>
//   );
// }