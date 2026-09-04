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
  const round = params.round || "1";
  const router = useRouter();
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleAdminAdded = () => {
      console.log("You have been added to Round 1 by an admin");

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

          if (currentRoundNumber !== 1) {
            showErrorToast("Round 1 is not the current round");
            return;
          }

          if (currentRoundStatus === "LOBBY") {
            showSuccessToast(
              "You have been added to Round 1! Redirecting to lobby...",
            );
            setTimeout(() => router.push("/r1/lobby"), 1500);
          } else if (currentRoundStatus === "IN_PROGRESS") {
            showSuccessToast(
              "You have been added to Round 1! Redirecting to waiting room...",
            );
            setTimeout(() => router.push("/r1/waiting"), 1500);
          } else if (currentRoundStatus === "COMPLETED") {
            showErrorToast("Round 1 has already completed");
          } else if (currentRoundStatus === "LOCKED") {
            showErrorToast("Round 1 is currently locked");
          }
        },
      );
    };

    socket.on("round1:adminAdded", handleAdminAdded);

    return () => {
      socket.off("round1:adminAdded", handleAdminAdded);
    };
  }, [socket, isConnected, router]);

  const rules = [
    "This is a competitive round where correctness, speed, and strategy all matter.",
    "Your score depends on test cases passed, match outcome, submission discipline, and time left.",
    "Winning the match gives a major advantage.",
    "Submitting too many times removes the submission bonus.",
    "Finishing earlier results in a higher score.",
  ];

  return <RulesPage rules={rules} round="1" />;
}
