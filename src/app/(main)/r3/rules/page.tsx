"use client"

import RulesPage from "@/components/shared/RulesPage";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSocket } from "@/contexts/SocketContext";
import { showErrorToast, showSuccessToast } from "@/components/shared/CustomToast";

export default function Rules() {
    const params = useParams();
    const round = params.round || "3";
    const router = useRouter();
    const { socket, isConnected } = useSocket();

    useEffect(() => {
        if (!socket || !isConnected) return;

        const handleAdminAdded = () => {
            console.log("You have been added to Round 3 by an admin");
            
            // Check current round status
            socket.emit("user:current-round", {}, (response: { success: boolean; currentRound?: { currentRoundNumber: number; currentRoundStatus: 'LOBBY' | 'COMPLETED' | 'LOCKED' | 'IN_PROGRESS'; }; error?: string }) => {
                if (!response.success || !response.currentRound) {
                    showErrorToast("Failed to check round status");
                    return;
                }
        
                const { currentRoundNumber, currentRoundStatus } = response.currentRound;
                console.log(currentRoundNumber, currentRoundStatus);
        
                if (currentRoundNumber !== 3) {
                    showErrorToast("Round 3 is not the current round");
                    return;
                }
        
                if (currentRoundStatus === 'LOBBY') {
                    showSuccessToast("You have been added to Round 3! Redirecting to lobby...");
                    setTimeout(() => router.push('/r3/lobby'), 1500);
                } else if (currentRoundStatus === 'IN_PROGRESS') {
                    showSuccessToast("You have been added to Round 3! Redirecting to lobby...");
                    setTimeout(() => router.push('/r3/lobby'), 1500);
                } else if (currentRoundStatus === 'COMPLETED') {
                    showErrorToast("Round 3 has already completed");
                } else if (currentRoundStatus === 'LOCKED') {
                    showErrorToast("Round 3 is currently locked");
                }
            });
        };

        socket.on('round3:adminAdded', handleAdminAdded);

        return () => {
            socket.off('round3:adminAdded', handleAdminAdded);
        };
    }, [socket, isConnected, router]);
        
    const rules = [
        "Round 3 rules will be announced.",
        "Stay tuned for more details."
    ];

    return <RulesPage rules={rules} round="3" />;
}
