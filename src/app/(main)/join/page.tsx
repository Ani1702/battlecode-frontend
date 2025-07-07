"use client";
import { useRef, useState } from "react";
import Button from "@/components/shared/button";
import ColoredBtn from "@/components/shared/ColoredBtn";
import { useSocket } from "@/contexts/SocketContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function Join() {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const router = useRouter();

  const handleInputChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value.toUpperCase(); // Convert to uppercase to match server's matchId format

    // Update the code array
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError(""); // Clear any previous errors when typing

    // If a character is typed and it's not the last input, move to next
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const getCompleteCode = () => {
    return code.join("");
  };

  const handleJoinGame = () => {
    const matchId = getCompleteCode();

    if (matchId.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }

    if (!user) {
      setError("You must be logged in to join a game");
      return;
    }

    if (!socket || !isConnected) {
      setError("Connection not ready. Please try again.");
      return;
    }

    setIsJoining(true);
    setError("");

    // Add timeout fallback
    const timeout = setTimeout(() => {
      setIsJoining(false);
      setError("Server response timed out");
    }, 10000);

    // Emit the joinMatch event as per your server implementation
    socket.emit(
      "joinMatch",
      { matchId },
      (
        response:
          | {
              success: boolean;
              matchId: string;
              playerId: string;
              playerAId: string;
              playerBId: string;
              settings: any;
            }
          | { error: string }
      ) => {
        clearTimeout(timeout);
        setIsJoining(false);

        if (!response) {
          setError("No response from server");
          return;
        }

        if ("error" in response) {
          setError(response.error);
          console.error("Join match error:", response.error);
        } else if (response.success) {
          console.log("Joined match:", response.matchId);
          // Redirect to the game page with match details
          router.push(`/play/${response.matchId}/waiting`);
        }
      }
    );
  };

  return (
    <div className="bg-black flex flex-col h-full relative">
      <div className="absolute top-4 left-4 z-10">
        <Button content="< Back" onClick={() => router.back()} />
      </div>
      <div className="flex-1 flex items-end justify-center text-6xl font-oxanium">
        <span className="bg-gradient-to-r from-yellow-200 to-orange-600 bg-clip-text text-transparent text-bold">
          ENTER CODE
        </span>
      </div>
      <div className="flex-1 flex justify-center items-center gap-10">
        {code.map((char, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            className="rounded-md h-25 w-20 bg-gray-700/40 text-white text-center text-2xl font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={1}
            value={char}
            onChange={(e) => handleInputChange(index, e)}
            onKeyDown={(e) => {
              // Handle backspace to move to previous input
              if (e.key === "Backspace" && !char && index > 0) {
                inputRefs.current[index - 1]?.focus();
              }
            }}
          />
        ))}
      </div>
      <div className="flex-1 flex flex-col justify-start items-center gap-4">
        <ColoredBtn
          content={isJoining ? "Joining..." : "Join Game"}
          onClick={handleJoinGame}
        />
        {error && <div className="text-red-500 text-center">{error}</div>}
      </div>
    </div>
  );
}
