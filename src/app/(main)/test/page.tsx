// 'use client';
// import { useState, useEffect, FC } from 'react';
// import { io, Socket } from 'socket.io-client';

// // --- Type Definitions ---
// interface User {
//   id: string;
//   name: string;
//   isAdmin: boolean;
// }

// interface Question {
//   id: string;
//   text: string;
// }

// // Define types for Socket.IO events for type safety
// interface ServerToClientEvents {
//   'lobby:round0': (data: { participants: User[] }) => void;
//   'round0:start': (data: { questions: Question[]; duration: number }) => void;
//   'round0:timer': (data: { timeLeft: number }) => void;
//   'round0:end': (data: { message: string }) => void;
//   'connect': () => void;
//   'disconnect': () => void;
// }

// interface ClientToServerEvents {
//   'round0:join': (callback: (response: { success: boolean; error?: string }) => void) => void;
//   'round0:ready': (callback: (response: { success: boolean; error?: string }) => void) => void;
// }

// // --- Mock User Data ---
// const regularUser: User = { id: `user_${Date.now()}`, name: 'Player', isAdmin: false };
// const adminUser: User = { id: `admin_${Date.now()}`, name: 'Admin', isAdmin: true };

// // --- Helper Component for Timer ---
// const Timer: FC<{ seconds: number }> = ({ seconds }) => {
//   const minutes = Math.floor(seconds / 60);
//   const remainingSeconds = seconds % 60;
//   return (
//     <div className="text-4xl font-bold text-indigo-600">
//       {String(minutes).padStart(2, '0')}:{String(remainingSeconds).padStart(2, '0')}
//     </div>
//   );
// };

// // --- Main Page Component ---
// const ContestPage: FC = () => {
//   // --- State Management ---
//   const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
//   const [currentUser, setCurrentUser] = useState<User>(regularUser);
//   const [gameState, setGameState] = useState<'disconnected' | 'lobby' | 'in-progress' | 'ended'>('disconnected');
//   const [participants, setParticipants] = useState<User[]>([]);
//   const [questions, setQuestions] = useState<Question[]>([]);
//   const [timeLeft, setTimeLeft] = useState<number>(0);
//   const [error, setError] = useState<string>('');

//   // --- Effect for Socket Connection and Event Handling ---
//   useEffect(() => {
//     // Connect to the Socket.IO server.
//     const newSocket: Socket<ServerToClientEvents, ClientToServerEvents> = io('http://localhost:3001', { // Adjust URL to your server
//       auth: { user: currentUser }
//     });
//     setSocket(newSocket);

//     // --- Event Listeners ---
//     newSocket.on('connect', () => {
//       console.log('Connected to server with ID:', newSocket.id);
//       setGameState('lobby');
//     });

//     newSocket.on('lobby:round0', (data) => {
//       console.log('Lobby updated:', data.participants);
//       setParticipants(data.participants);
//     });

//     newSocket.on('round0:start', (data) => {
//       console.log('Round started!', data);
//       setQuestions(data.questions);
//       setTimeLeft(data.duration);
//       setGameState('in-progress');
//     });

//     newSocket.on('round0:timer', (data) => {
//       setTimeLeft(data.timeLeft);
//     });

//     newSocket.on('round0:end', (data) => {
//       console.log('Round ended:', data.message);
//       setGameState('ended');
//     });

//     newSocket.on('disconnect', () => {
//         console.log('Disconnected from server.');
//         setGameState('disconnected');
//     });

//     // --- Cleanup ---
//     return () => {
//       newSocket.disconnect();
//     };
//   }, [currentUser]);

//   // --- Client-side Actions ---
//   const handleJoinRound = () => {
//     if (!socket) return;
//     socket.emit('round0:join', (response) => {
//       if (response.success) {
//         console.log('Successfully joined lobby.');
//       } else {
//         setError(response.error || 'An unknown error occurred.');
//       }
//     });
//   };

//   const handleStartRound = () => {
//     if (!socket || !currentUser.isAdmin) return;
//     socket.emit('round0:ready', (response) => {
//       if (!response.success) {
//         setError(response.error || 'An unknown error occurred.');
//       }
//     });
//   };

//   const toggleUserType = () => {
//     if (socket) socket.disconnect();
//     setCurrentUser(currentUser.isAdmin ? regularUser : adminUser);
//     setParticipants([]);
//     setError('');
//   };

//   // --- Render Logic ---
//   return (
//     <div className="bg-gray-50 min-h-screen flex flex-col items-center justify-center font-sans p-4">
//       <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-8 space-y-6">
        
//         <div className="text-center border-b pb-4">
//           <h1 className="text-3xl font-bold text-gray-800">Contest - Round 0</h1>
//           <p className="text-gray-500">
//             Current Status: <span className="font-semibold text-indigo-600 capitalize">{gameState}</span>
//           </p>
//         </div>

//         <div className="text-center bg-gray-100 p-3 rounded-lg">
//             <p className="text-sm text-gray-700">You are currently: <strong className={currentUser.isAdmin ? 'text-red-500' : 'text-blue-500'}>{currentUser.isAdmin ? 'Admin' : 'Player'}</strong></p>
//             <button onClick={toggleUserType} className="mt-2 text-sm text-indigo-600 hover:underline">
//                 Switch to {currentUser.isAdmin ? 'Player' : 'Admin'} View
//             </button>
//         </div>

//         {error && <div className="text-center text-red-500 bg-red-100 p-3 rounded-lg">{error}</div>}

//         {gameState === 'lobby' && (
//           <div className="space-y-4">
//             <button
//               onClick={handleJoinRound}
//               className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition duration-300"
//             >
//               Join Round 0 Lobby
//             </button>
            
//             <div className="space-y-2">
//                 <h2 className="text-xl font-semibold text-gray-700">Participants ({participants.length})</h2>
//                 <ul className="bg-gray-50 p-4 rounded-lg h-40 overflow-y-auto">
//                     {participants.length > 0 ? participants.map(p => (
//                         <li key={p.id} className="text-gray-600">{p.name} {p.isAdmin && '(Admin)'}</li>
//                     )) : <li className="text-gray-400">No one has joined yet.</li>}
//                 </ul>
//             </div>

//             {currentUser.isAdmin && (
//               <button
//                 onClick={handleStartRound}
//                 disabled={participants.length === 0}
//                 className="w-full bg-red-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-red-600 disabled:bg-gray-300 transition duration-300"
//               >
//                 Start Round for Everyone
//               </button>
//             )}
//           </div>
//         )}

//         {gameState === 'in-progress' && (
//           <div className="text-center space-y-6">
//             <Timer seconds={timeLeft} />
//             <div className="space-y-3 text-left">
//                 <h2 className="text-xl font-semibold text-gray-700">Questions</h2>
//                 <ul className="list-decimal list-inside bg-gray-50 p-4 rounded-lg space-y-2">
//                     {questions.map(q => <li key={q.id} className="text-gray-800">{q.text}</li>)}
//                 </ul>
//             </div>
//           </div>
//         )}

//         {gameState === 'ended' && (
//           <div className="text-center py-10">
//             <h2 className="text-2xl font-bold text-gray-800">Round Over!</h2>
//             <p className="text-gray-500">Time's up. Hope you did well!</p>
//           </div>
//         )}

//       </div>
//     </div>
//   );
// };

// export default ContestPage;


// app/page.tsx
import { Lock, Sparkles, Radio, LogOut } from 'lucide-react';

// --- MOCK DATA ---
// This data would typically come from an API
const roundsData = [
  {
    id: 0,
    title: 'Qualifiers',
    status: 'active',
  },
  {
    id: 1,
    title: 'Head-to-Head',
    status: 'locked',
  },
  {
    id: 2,
    title: 'Elite Bounties',
    status: 'locked',
  },
  {
    id: 3,
    title: 'The Final Hack',
    status: 'locked',
  },
];

const leaderboardData = [
  { rank: 1, player: 'cypher', score: 2454 },
  { rank: 2, player: 'glitch', score: 2346 },
  { rank: 3, player: 'reaver', score: 2319 },
  { rank: 4, player: 'sentinal', score: 2160 },
  { rank: 5, player: 'omen', score: 2083 },
  { rank: 6, player: 'vex', score: 1958 },
  { rank: 7, player: 'jett', score: 1884 },
  { rank: 8, player: 'raze', score: 1783 },
];

// --- Reusable Icon Components for cleaner mapping ---
const RoundStatusIcon = ({ status }: { status: string }) => {
  if (status === 'active') {
    return <Sparkles className="h-6 w-6 text-brand-orange animate-subtle-pulse" />;
  }
  if (status === 'locked') {
    return <Lock className="h-5 w-5 text-gray-500" />;
  }
  return null;
};

// --- Main Page Component ---
export default function BattleCodeDashboard() {
  return (
    <main className="min-h-screen bg-dark-bg font-sans text-gray-200 bg-grid-pattern bg-grid-size p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-xl sm:text-2xl font-bold tracking-wider">
            <span className="text-brand-orange">&lt;&gt;</span> BattleCode Arena
          </h1>
          <button className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-300">
            <span className="hidden sm:inline">Logout</span>
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Competition Rounds */}
          <div className="lg:col-span-2">
            <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-brand-orange to-brand-red text-transparent bg-clip-text mb-6">
              Competition Rounds
            </h2>
            <div className="space-y-4">
              {roundsData.map((round) => {
                const isActive = round.status === 'active';
                return (
                  <div
                    key={round.id}
                    className={`
                      flex items-center justify-between p-4 rounded-lg border
                      transition-all duration-300
                      ${isActive
                        ? 'bg-card-bg border-brand-orange shadow-[0_0_15px_rgba(249,115,22,0.3)] cursor-pointer'
                        : 'bg-transparent border-border-dark cursor-not-allowed'
                      }
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`text-2xl font-bold ${isActive ? 'text-white' : 'text-gray-600'}`}>
                        {String(round.id).padStart(2, '0')}
                      </span>
                      <div>
                        <h3 className={`text-lg font-semibold ${isActive ? 'text-white' : 'text-gray-500'}`}>
                          {round.title}
                        </h3>
                        <p className={`text-sm uppercase tracking-widest ${isActive ? 'text-brand-orange' : 'text-gray-600'}`}>
                          {round.status}
                        </p>
                      </div>
                    </div>
                    <RoundStatusIcon status={round.status} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Live Leaderboard */}
          <div className="lg:col-span-1">
            <div className="bg-card-bg border border-border-dark rounded-lg backdrop-blur-sm p-6 sticky top-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">Live Leaderboard</h3>
                <Radio className="h-5 w-5 text-gray-400" />
              </div>
              
              {/* Leaderboard Header */}
              <div className="flex justify-between text-xs text-gray-400 uppercase tracking-wider pb-2 border-b border-border-dark mb-4">
                <span className="w-1/6 text-left">Rank</span>
                <span className="w-3/6 text-left">Player</span>
                <span className="w-2/6 text-right">Score</span>
              </div>

              {/* Leaderboard List */}
              <ul className="space-y-3">
                {leaderboardData.map((player, index) => (
                  <li key={index} className="flex justify-between items-center text-sm font-medium hover:bg-white/5 p-2 rounded-md transition-colors">
                    <span className="w-1/6 text-left text-gray-400">{player.rank}</span>
                    <span className="w-3/6 text-left text-white tracking-wide">{player.player}</span>
                    <span className="w-2/6 text-right text-brand-orange font-semibold">{player.score}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}