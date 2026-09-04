"use client";
import RulesPage from "@/components/shared/RulesPage";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSocket } from "@/contexts/SocketContext";
import {
  showErrorToast,
  showSuccessToast,
} from "@/components/shared/CustomToast";

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
      socket.emit(
        "user:current-round",
        {},
        (response: {
          success: boolean;
          currentRound?: {
            currentRoundNumber: number;
            currentRoundStatus:
              | "LOBBY"
              | "COMPLETED"
              | "LOCKED"
              | "IN_PROGRESS";
          };
          error?: string;
        }) => {
          if (!response.success || !response.currentRound) {
            showErrorToast("Failed to check round status");
            return;
          }

          const { currentRoundNumber, currentRoundStatus } =
            response.currentRound;
          console.log(currentRoundNumber, currentRoundStatus);

          if (currentRoundNumber !== 2) {
            showErrorToast("Round 2 is not the current round");
            return;
          }

          if (currentRoundStatus === "LOBBY") {
            showSuccessToast(
              "You have been added to Round 2! Redirecting to lobby...",
            );
            setTimeout(() => router.push("/r2/lobby"), 1500);
          } else if (currentRoundStatus === "IN_PROGRESS") {
            showSuccessToast(
              "You have been added to Round 2! Redirecting to lobby...",
            );
            setTimeout(() => router.push("/r2/lobby"), 1500);
          } else if (currentRoundStatus === "COMPLETED") {
            showErrorToast("Round 2 has already completed");
          } else if (currentRoundStatus === "LOCKED") {
            showErrorToast("Round 2 is currently locked");
          }
        },
      );
    };

    socket.on("round2:adminAdded", handleAdminAdded);

    return () => {
      socket.off("round2:adminAdded", handleAdminAdded);
    };
  }, [socket, isConnected, router]);

  const rules = [
    "This is a one-on-one challenger round with a fixed time limit of 20 minutes.",
    "Scoring is based on test cases passed, match result, submission count, and time left.",
    "Elite players receive a 25% score reduction after scoring, while non-elite players receive a 25% score boost.",
    "In addition to the main problem, optional bounty questions are available.",
    "Each bounty allows a maximum of 3 submissions.",
    "Exceeding 3 submissions on a bounty converts the bounty into a negative score penalty.",
    "Bounties are high risk and can significantly impact your total score.",
  ];

  return <RulesPage rules={rules} round={round} />;
}
