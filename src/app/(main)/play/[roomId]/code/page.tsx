// CodeRoom.tsx
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSocket } from "@/contexts/SocketContext";

export default function CodeRoom() {
  const { gameId } = useParams();
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [timeLeft, setTimeLeft] = useState(0);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !gameId) return;

    // Listen for match updates
    socket.on("matchUpdate", (data) => {
      // Handle match updates
    });

    return () => {
      socket.off("matchUpdate");
    };
  }, [socket, gameId]);

  return (
    <div className="flex flex-col h-full p-4">
      <h1 className="text-3xl font-oxanium mb-4">Coding Challenge</h1>
      <div className="flex-1 grid grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-xl font-oxanium mb-2">Problem Statement</h2>
          {/* Problem statement will go here */}
        </div>
        <div className="bg-gray-800 rounded-lg p-4 flex flex-col">
          <div className="flex justify-between mb-2">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-gray-700 text-white p-1 rounded"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="c++">C++</option>
            </select>
            <div className="text-xl">Time Left: {timeLeft}s</div>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 bg-gray-900 text-white p-2 rounded font-mono"
            placeholder="Write your code here..."
          />
        </div>
      </div>
    </div>
  );
}
