"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSocket } from "@/contexts/SocketContext";
import CodeEditor from "@/components/editor/CodeEditor";

type Problem = {
  id: string;
  title: string;
  description: string;
  sampleCases: string[];
  constraints: string[];
};

export default function PlayRoom() {
  const { roomId } = useParams();
  const { socket } = useSocket();
  const router = useRouter();

  const [problem, setProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState("");
  const [players, setPlayers] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  useEffect(() => {
    if (!socket) {
      router.push("/dashboard");
      return;
    }

    // socket.emit("joinRoom", { roomId }, (response: any) => {
    //   if (response.error) {
    //     console.error(response.error);
    //     router.push("/dashboard");
    //     return;
    //   }
    //   setPlayers(response.players);
    //   setProblem(response.currentProblem);
    //   setTimeLeft(response.timeLeft);
    // });

    socket.on("problemUpdate", (newProblem: Problem) => {
      setProblem(newProblem);
      setCode("");
      setTestResults(null);
    });

    socket.on("timeUpdate", (time: number) => {
      setTimeLeft(time);
    });

    socket.on("testResults", (results: any) => {
      setTestResults(results);
    });

    socket.on("matchEnded", (result: any) => {
      alert(
        `Match ended! ${result.winner ? `Winner: ${result.winner}` : "Draw"}`
      );
      router.push("/dashboard");
    });

    return () => {
      socket.off("problemUpdate");
      socket.off("timeUpdate");
      socket.off("testResults");
      socket.off("matchEnded");
    };
  }, [socket, roomId, router]);

  const handleRunTests = () => {
    if (!problem) return;
    socket?.emit("runTests", { roomId, problemId: problem.id, code });
  };

  const handleSubmit = () => {
    if (!problem) return;
    setIsSubmitting(true);
    socket?.emit(
      "submitSolution",
      { roomId, problemId: problem.id, code },
      () => {
        setIsSubmitting(false);
      }
    );
  };

  if (!problem)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading battle...
      </div>
    );

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Battle: {roomId}</h1>
        <div className="text-xl font-mono bg-gray-800 text-white px-4 py-2 rounded">
          {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">{problem.title}</h2>
          <div className="prose max-w-none">
            <p>{problem.description}</p>

            <h3 className="font-semibold mt-4">Sample Cases:</h3>
            <ul className="list-disc pl-5">
              {problem.sampleCases.map((testCase, i) => (
                <li key={i} className="font-mono text-sm">
                  {testCase}
                </li>
              ))}
            </ul>

            <h3 className="font-semibold mt-4">Constraints:</h3>
            <ul className="list-disc pl-5">
              {problem.constraints.map((constraint, i) => (
                <li key={i}>{constraint}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <CodeEditor code={code} onChange={setCode} language="javascript" />

          {testResults && (
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="font-semibold mb-2">Test Results</h3>
              <div className="space-y-2">
                {testResults.passed ? (
                  <p className="text-green-600">
                    ✓ Passed {testResults.passedCount}/{testResults.totalCount}{" "}
                    tests
                  </p>
                ) : (
                  <p className="text-red-600">
                    ✗ Failed {testResults.failedTest}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex space-x-4">
            <button
              onClick={handleRunTests}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition"
            >
              Run Tests
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`px-4 py-2 rounded text-white transition ${
                isSubmitting ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
