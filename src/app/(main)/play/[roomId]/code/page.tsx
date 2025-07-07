// CodeRoom.tsx
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSocket } from "@/contexts/SocketContext";
import Button from "@/components/shared/button";

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
    <div className="flex flex-col h-full">
      <div className="flex-[0.2] items-center flex justify-center text-bold text-xl">PLAYER V/S PLAYER</div>
      <div className = "flex-[0.4] flex flex-col p-4 rounded-lg">
        <div className="flex-3  rounded-lg border border-t-amber-500 border-b-amber-600 border-l-amber-500 border-r-amber-500 flex">
          <div className="flex-1 flex justify-center items-center">Current Points: 100</div>
          <div className="flex-1 flex  justify-center items-center">Bonus Points: 20</div>
          <div className="flex-1 flex justify-center items-center">5:00</div>

        </div>
        <div className="flex h-3 w-full rounded-lg bg-black">
          <div className="bg-red-500 rounded-lg w-1/2"></div>
        </div>
        
      </div>
      <div className = "flex-4 flex p-4 gap-4 bg-black/40 backdrop-blur-sm ">
        <div className = "flex-1 flex border rounded-lg border-amber-600 bg-black/40 backdrop-blur-sm p-4">
          <span className="text-lg">QUESTION</span>
        </div>
        <div className = "flex-1  flex flex-col gap-4">
          <div className = "flex-1 border border-amber-600 rounded-lg p-4 flex flex-col">
            <span className="text-lg mb-2">CODE</span>
            <textarea 
              className="flex-1 bg-transparent text-white resize-none outline-none font-mono"
              placeholder="Write your code here..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div className = "flex-1 border border-amber-600 rounded-lg">
            <span className="text-lg pl-4 pt-4">TEST RESULT</span>
          </div>
          <div className = "flex-[0.1]  gap-2 p-2 flex justify-end">
            <Button content="Resign" />
            <Button content="Skip" />
            <Button content="Submit" />
          </div>
        </div>
      </div>
      
    </div>
  );
}
