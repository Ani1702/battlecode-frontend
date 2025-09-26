"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import CustomScrollbar from './CustomScrollbar';
import EliteCard from './EliteCard';
import BountyQuestionCard from './BountyQuestionCard';
import { BountyQuestion } from '../../types/types';

interface Elite {
  userId: string;
  username: string;
  status: 'WAITING' | 'IN_MATCH' | 'DISCONNECTED' | 'FINISHED';
  rank:number;
}

export default function ChallengerLobby() {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const { user, userId, isLoading: authLoading } = useAuth();
  
  const [bountyQuestions, setBountyQuestions] = useState<BountyQuestion[]>([]);
  const [activeBounty, setActiveBounty] = useState<{ questionId: string; endTime: number } | null>(null);
  const [elites, setElites] = useState<Elite[]>([]);
  const [challengeState, setChallengeState] = useState<{ [eliteId: string]: "idle" | "waiting" | "accepted" | "rejected" }>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const bountyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if(!socket) return;

    socket.emit("round2:bountyStart", (res: any) => {
      if (res.success) setBountyQuestions(res.questions);
    });
  }, [socket]);

  useEffect(() => {
  if (!socket) return;

  socket.on("round2:started", ({ elites }) => {
    setElites(
      elites.map((e: any) => ({
        userId: e.userId,
        username: e.username,
        rank: e.rank,  
        status: e.status || "WAITING",
      }))
    );
  });

  return () => {
    socket.off("round2:started");
  };
}, [socket]);

    const handleSelectBounty = (q: BountyQuestion) => {
    if(!socket) return;
    socket.emit("bounty:questionStart", { questionId: q.id }, (res: any) => {
      if (res.success) {
        setActiveBounty({ questionId: q.id, endTime: res.endTime });
        setTimeLeft(Math.max(0, Math.ceil((res.endTime - Date.now()) / 1000)));
      } else {
        alert(res.message);
      }
    });
  };

    useEffect(() => {
    if (!activeBounty ||!socket) return;
    bountyIntervalRef.current = setInterval(() => {
      socket.emit("round2:bountyProgress", { questionId: activeBounty.questionId });
    }, 5000);

    // Countdown timer
    countdownRef.current = setInterval(() => {
      setTimeLeft(Math.max(0, Math.ceil((activeBounty.endTime - Date.now()) / 1000)));
    }, 1000);

    return () => {
      if (bountyIntervalRef.current) {
        clearInterval(bountyIntervalRef.current);
        bountyIntervalRef.current = null;
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [activeBounty, socket]);

  //bounty suggestion after fixed intervals of inactivity
    useEffect(() => {
      if(!socket) return;
      socket.on("round2:bountySuggestion", (payload: any) => {
        alert(payload.message);
      });
      return () => {
      socket.off("round2:bountySuggestion");
    };
  }, [socket]);

  useEffect(() => {
  if (!socket) return;

  const handleBountyStartFromServer = (payload: { questionId: string; endTime: number }) => {
    setActiveBounty({ questionId: payload.questionId, endTime: payload.endTime });
    setTimeLeft(Math.max(0, Math.ceil((payload.endTime - Date.now()) / 1000)));
  };

  socket.on("round2:bountyBeginQuestion", handleBountyStartFromServer);

  return () => {
    socket.off("round2:bountyBeginQuestion", handleBountyStartFromServer);
  };
}, [socket]);

  const handleChallenge = (eliteId: string) => {
    if(!socket) return;
    setChallengeState((prev) => ({ ...prev, [eliteId]: "waiting" }));
    socket.emit("round2:challengeRequest", { eliteId }, (res: any) => {
      if (!res.success) {
        setChallengeState((prev) => ({ ...prev, [eliteId]: "idle" }));
        alert(res.message);
      }
    });
  };

  useEffect(() => {
  if (!socket) return;

  const handleMatchResult = ({ challengerScore, eliteScore, winner }: any) => {
    alert(`Match ended! Winner: ${winner}. Scores - Challenger: ${challengerScore}, Elite: ${eliteScore}`);
    // Optionally update UI: reset challengeState or remove match from active list
  };

  socket.on("round2:matchResult", handleMatchResult);
  return () => {socket.off("round2:matchResult", handleMatchResult)};
}, [socket]);

  useEffect(() => {
    if(!socket || !user) return;
    // Accepted challenge
    socket.on("round2:challengeAccepted", ({ challengerId, eliteId }: any) => {
      if (challengerId === userId) {
        setChallengeState((prev) => ({ ...prev, [eliteId]: "accepted" }));
      }
    });

    // Rejected challenge
    socket.on("round2:challengeRejected", ({ challengerId, eliteId }: any) => {
      if (challengerId === userId) {
        setChallengeState((prev) => ({ ...prev, [eliteId]: "rejected" }));
        setTimeout(() => {
          setChallengeState((prev) => ({ ...prev, [eliteId]: "idle" }));
        }, 2 * 60 * 1000); // 2 min cooldown
      }
    });

    // Match started
    socket.on("round2:matchStarted", ({ matchId, question, endTime }: any) => {
      console.log("Match started!", matchId, question);
      router.push(`/round2/match/${matchId}`);
    });

    return () => {
      socket.off("round2:challengeAccepted");
      socket.off("round2:challengeRejected");
      socket.off("round2:matchStarted");
    };
  }, [socket, userId]);

  useEffect(() => {
  if (!socket || !user) return;

  socket.on("round2:reconnect", ({ matchId, question, endTime }: any) => {
    if (question) {
      setActiveBounty({ questionId: question.id, endTime });
      setTimeLeft(Math.max(0, Math.ceil((endTime - Date.now()) / 1000)));
    }
    // optionally navigate to match page
  });

  return () => {socket.off("round2:reconnect")};
}, [socket, user]);

useEffect(() => {
  if (!socket) return;

  socket.on("round2:rolesAssigned", ({ role }: { role: string }) => {
    // store role in state if needed for UI
    console.log("Assigned role:", role);
  });

  return () =>{ socket.off("round2:rolesAssigned")};
}, [socket]);

useEffect(() => {
  const handleBeforeUnload = () => {
    socket?.emit("round2:disconnect");
  };
  window.addEventListener("beforeunload", handleBeforeUnload);
  return () => window.removeEventListener("beforeunload", handleBeforeUnload);
}, [socket]);

useEffect(() => {
  if (!socket) return;
  socket.on("round2:cooldown", ({ duration }: any) => {
    alert(`You are on cooldown for ${duration} seconds.`);
  });
  return () => {socket.off("round2:cooldown")};
}, [socket]);


  return (
    <>
      <div className="flex bg-[url('/elite_bg2.svg')] bg-[length:1200px_800px] bg-center bg-no-repeat h-screen flex-col overflow-hidden orbitron">
        <div className="flex-1 flex items-center justify-center text-6xl oxanium white-glow"><Image src="/b-2.svg" alt="Battlecode Logo" className="h-20" width={80} height={80}/>CHALLENGER DASHBOARD</div>
        <div className="flex-4 flex flex-row">
          <div className="flex-1">
            <div className="h-[80%] w-[80%] glass-box rounded-lg m-auto mt-10 p-5">
              <h2 className="text-2xl font-bold text-white mb-4 font-orbitron">
                Elites
              </h2>
              
              <CustomScrollbar className="h-[calc(100%-3rem)] overflow-y-auto pr-2">
                {elites.length > 0 ? (
                  elites.map((player) => (
                    <EliteCard
                      key={player.userId}
                      player={{ id: player.userId, username: player.username,rank: player.rank }}
                      onChallenge={() => handleChallenge(player.userId)}
                    />
                  ))
                ) : (
                  <div className="text-center text-gray-500 mt-8">
                    <p className="text-lg">No elites available</p>
                    <p className="text-sm">Check back later for elite players!</p>
                  </div>
                )}
              </CustomScrollbar>
            </div>
          </div>
          
          <div className="flex-1">
            <div className="h-[80%] w-[80%] glass-box rounded-lg m-auto mt-10 p-5">
              <h2 className="text-2xl font-bold text-white mb-4 font-orbitron">
                Bounty Questions
              </h2>
              
              <CustomScrollbar className="h-[calc(100%-3rem)] overflow-y-auto pr-2 ">
                {bountyQuestions.length > 0 ? (
                  bountyQuestions.map((question) => (
                    <BountyQuestionCard
                      key={question.id}
                      question={question}
                      onClick={() => handleSelectBounty(question)}
                    />
                  ))
                ) : (
                  <div className="text-center text-gray-500 mt-8">
                    <p className="text-lg">No bounty questions available</p>
                    <p className="text-sm">Check back later for new challenges!</p>
                  </div>
                )}
              </CustomScrollbar>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}