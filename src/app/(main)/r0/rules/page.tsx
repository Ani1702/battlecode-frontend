"use client"

import RulesPage from "@/components/shared/RulesPage";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSocket } from "@/contexts/SocketContext";
import { showErrorToast, showSuccessToast } from "@/components/shared/CustomToast";

export default function Rules() {
    const params = useParams();
    const round = params.round || "0";
    const router = useRouter();
    const { socket, isConnected } = useSocket();

    useEffect(() => {
        if (!socket || !isConnected) return;

        const handleAdminAdded = () => {
            console.log("You have been added to Round 0 by an admin");
            
            // Check current round status
            socket.emit("user:current-round", {}, (response: { success: boolean; currentRound?: { currentRoundNumber: number; currentRoundStatus: 'LOBBY' | 'COMPLETED' | 'LOCKED' | 'IN_PROGRESS'; }; error?: string }) => {
                if (!response.success || !response.currentRound) {
                    showErrorToast("Failed to check round status");
                    return;
                }
        
                const { currentRoundNumber, currentRoundStatus } = response.currentRound;
                console.log(currentRoundNumber, currentRoundStatus);
        
                if (currentRoundNumber !== 0) {
                    showErrorToast("Round 0 is not the current round");
                    return;
                }
        
                if (currentRoundStatus === 'LOBBY') {
                    showSuccessToast("You have been added to Round 0! Redirecting to lobby...");
                    setTimeout(() => router.push('/r0/lobby'), 1500);
                } else if (currentRoundStatus === 'IN_PROGRESS') {
                    showSuccessToast("You have been added to Round 0! Redirecting to code page...");
                    setTimeout(() => router.push('/r0/code'), 1500);
                } else if (currentRoundStatus === 'COMPLETED') {
                    showErrorToast("Round 0 has already completed");
                } else if (currentRoundStatus === 'LOCKED') {
                    showErrorToast("Round 0 is currently locked");
                }
            });
        };

        socket.on('round0:adminAdded', handleAdminAdded);

        return () => {
            socket.off('round0:adminAdded', handleAdminAdded);
        };
    }, [socket, isConnected, router]);
        
    const rules = [
        "Round 0 rules will be announced.",
        "Stay tuned for more details."
    ];

    return <RulesPage rules={rules} round="Round 0" />;
}
