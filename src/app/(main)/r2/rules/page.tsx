"use client"
import RulesPage from "@/components/shared/RulesPage";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSocket } from "@/contexts/SocketContext";
import { showErrorToast, showSuccessToast } from "@/components/shared/CustomToast";

export default function Rules() {
    const params = useParams();
    const round = params.round || "2";
    const router = useRouter();
    const { socket, isConnected } = useSocket();

    useEffect(() => {
        if (!socket || !isConnected) return;

        const handleAdminAdded = () => {
            console.log("You have been added to Round 2 by an admin");
            
            // Check current round status
            socket.emit("user:current-round", {}, (response: { success: boolean; currentRound?: { currentRoundNumber: number; currentRoundStatus: 'LOBBY' | 'COMPLETED' | 'LOCKED' | 'IN_PROGRESS'; }; error?: string }) => {
                if (!response.success || !response.currentRound) {
                    showErrorToast("Failed to check round status");
                    return;
                }
        
                const { currentRoundNumber, currentRoundStatus } = response.currentRound;
                console.log(currentRoundNumber, currentRoundStatus);
        
                if (currentRoundNumber !== 2) {
                    showErrorToast("Round 2 is not the current round");
                    return;
                }
        
                if (currentRoundStatus === 'LOBBY') {
                    showSuccessToast("You have been added to Round 2! Redirecting to lobby...");
                    setTimeout(() => router.push('/r2/lobby'), 1500);
                } else if (currentRoundStatus === 'IN_PROGRESS') {
                    showSuccessToast("You have been added to Round 2! Redirecting to lobby...");
                    setTimeout(() => router.push('/r2/lobby'), 1500);
                } else if (currentRoundStatus === 'COMPLETED') {
                    showErrorToast("Round 2 has already completed");
                } else if (currentRoundStatus === 'LOCKED') {
                    showErrorToast("Round 2 is currently locked");
                }
            });
        };

        socket.on('round2:adminAdded', handleAdminAdded);

        return () => {
            socket.off('round2:adminAdded', handleAdminAdded);
        };
    }, [socket, isConnected, router]);

    const rules = [" At the start, everyone is assigned a role: Elite or Challenger.",
        " Elites defend themselves when challenged.",
        " Challengers can challenge Elites to 1-on-1 matches.",
" While waiting, both Elites and Challengers can solve bounty problems (optional side quests).",
" Winning a challenge or completing a bounty increases your score.",
" After each challenge, both players go into a 60 seconds cooldown before they can play again.",
" If someone disconnects during a match and doesn't return, they lose by default."
    ];
    return <RulesPage rules={rules} round={round} />;
}