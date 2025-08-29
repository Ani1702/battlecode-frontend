"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSocket } from "@/contexts/SocketContext";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/shared/button";

interface TestCase {
  input: {
    stdin?: string;
    json?: string;
  };
  output: {
    stdout?: string;
    json?: any;
  };
  explanation?: string;
}

interface Question {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  constraints: string[];
  hints: string[];
  boilerplate: Record<string, string>;
  sampleTestCases: TestCase[];
  hiddenTestCases: TestCase[];
  categories: string[];
  avgTimeComplexity: string;
  avgSpaceComplexity: string;
}

interface MatchData {
  id: string;
  playerAId: string;
  playerBId?: string;
  status: string;
  settings: {
    timeLimit: number;
    noOfQuestions: number;
    difficulty: string;
    topics: string[];
  };
  questions?: Question[];
  currentQuestionIndex?: number;
  startedAt?: string;
}

interface SubmissionResult {
  token: string;
  status: {
    id: number;
    description: string;
  };
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  time: string | null;
  memory: string | null;
}

export default function CodeRoom() {
  // const { matchId } = useParams();
  const router = useRouter();
  // const { socket } = useSocket();
  // const { user } = useAuth();

  // Mock question for client-only mode
  const mockQuestion: Question = {
    id: "practice-1",
    title: "Sum of Two Numbers",
    description: "Given two integers, return their sum.",
    difficulty: "Easy",
    constraints: ["-1000 ≤ a, b ≤ 1000"],
    hints: ["Use the + operator.", "Return the result directly."],
    boilerplate: {
      javascript: "function sum(a, b) {\n  // your code here\n}",
      python: "def sum(a, b):\n    # your code here",
      java: "public int sum(int a, int b) {\n  // your code here\n}",
      cpp: "int sum(int a, int b) {\n  // your code here\n}",
      c: "int sum(int a, int b) {\n  // your code here\n}",
    },
    sampleTestCases: [
      {
        input: { stdin: "2 3" },
        output: { stdout: "5" },
        explanation: "2 + 3 = 5",
      },
      {
        input: { stdin: "-1 1" },
        output: { stdout: "0" },
        explanation: "-1 + 1 = 0",
      },
    ],
    hiddenTestCases: [
      {
        input: { stdin: "1000 -1000" },
        output: { stdout: "0" },
      },
    ],
    categories: ["Math"],
    avgTimeComplexity: "O(1)",
    avgSpaceComplexity: "O(1)",
  };

  const [code, setCode] = useState(mockQuestion.boilerplate["javascript"]);
  const [language, setLanguage] = useState("javascript");
  const [timeLeft, setTimeLeft] = useState(300); // 5 min default
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(mockQuestion);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(1);
  const [matchStatus, setMatchStatus] = useState("PRACTICE");
  // const [match, setMatch] = useState<MatchData | null>(null);
  // const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResults, setSubmissionResults] = useState<SubmissionResult[] | null>(null);
  const [showHints, setShowHints] = useState(false);


  // const handleSubmit = async () => { ...existing code... };
  // const handleNext = () => { ...existing code... };
  // const handleGoBack = () => { ...existing code... };
  // const handleRetry = () => { ...existing code... };
  // const formatTime = (seconds: number) => { ...existing code... };

  // Local formatTime for timer
  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  // Fake handleSubmit for client-only mode
  function handleSubmit() {
    if (!currentQuestion || isSubmitting) return;
    setIsSubmitting(true);
    setTimeout(() => {
      // Always "pass" the first sample, fail the second for demo
      setSubmissionResults([
        {
          token: "mock1",
          status: { id: 3, description: "Accepted" },
          stdout: "5",
          stderr: null,
          compile_output: null,
          time: "0.01",
          memory: "1024",
        },
        {
          token: "mock2",
          status: { id: 6, description: "Wrong Answer" },
          stdout: "1",
          stderr: null,
          compile_output: null,
          time: "0.01",
          memory: "1024",
        },
      ]);
      setIsSubmitting(false);
    }, 1200);
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header and Timer */}
      <div className="flex-shrink-0 flex items-center justify-between p-2 border-b border-gray-700">
        <h1 className="text-lg font-bold text-amber-400">Code Duel (Practice Mode)</h1>
        <div className="flex items-center gap-4">
            <div className="text-center text-sm">Question: {questionIndex + 1} / {totalQuestions}</div>
            <div className="text-center p-2 font-mono text-lg bg-gray-800 rounded">{formatTime(timeLeft)}</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-grow flex p-4 gap-4 bg-black/40 backdrop-blur-sm overflow-hidden">
        {/* Question Panel */}
        <div className="w-1/2 flex border rounded-lg border-amber-600 bg-black/40 p-4 flex-col overflow-y-auto">
          <h2 className="text-2xl font-bold mb-4">{currentQuestion!.title}</h2>
          <p className="mb-4 text-gray-300 whitespace-pre-wrap">{currentQuestion!.description}</p>
          
          <h3 className="font-bold mb-2 text-amber-400">Constraints:</h3>
          <ul className="list-disc list-inside mb-4 text-gray-300 font-mono text-sm">
            {currentQuestion!.constraints.map((constraint, i) => (
                <li key={i}>{constraint}</li>
            ))}
          </ul>
          
          <h3 className="font-bold mb-4 text-amber-400">Sample Cases:</h3>
          {currentQuestion!.sampleTestCases.map((testCase, i) => (
            <div key={i} className="mb-4 bg-gray-800 p-3 rounded font-mono text-sm">
              <p className="font-bold text-gray-400">Input:</p>
              <pre className="bg-gray-900 p-2 rounded mt-1 whitespace-pre-wrap">{testCase.input.stdin || testCase.input.json}</pre>
              <p className="mt-2 font-bold text-gray-400">Output:</p>
              <pre className="bg-gray-900 p-2 rounded mt-1 whitespace-pre-wrap">{testCase.output.stdout || JSON.stringify(testCase.output.json)}</pre>
              {testCase.explanation && <p className="mt-2 text-xs text-gray-400 italic">Explanation: {testCase.explanation}</p>}
            </div>
          ))}

          <div className="mt-auto pt-4">
             <Button
                content={showHints ? "Hide Hints" : "Show Hints 💡"}
                onClick={() => setShowHints(!showHints)}
              />
            {showHints && (
              <div className="mt-2 bg-gray-800 p-3 rounded">
                  <ul className="list-disc list-inside text-gray-300 space-y-2">
                      {currentQuestion!.hints.map((hint, i) => <li key={i}>{hint}</li>)}
                  </ul>
              </div>
            )}
          </div>
        </div>

        {/* Code & Results Panel */}
        <div className="w-1/2 flex flex-col gap-4">
          {/* Code Editor */}
          <div className="flex-1 border border-amber-600 rounded-lg p-4 flex flex-col min-h-0">
            <div className="flex justify-between items-center mb-2">
              <span className="text-lg font-bold">Code Editor</span>
              <select
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value);
                  setCode(mockQuestion.boilerplate[e.target.value] || "");
                }}
                className="bg-gray-800 text-white p-2 rounded border border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
                <option value="c">C</option>
              </select>
            </div>
            <textarea
              className="flex-1 bg-gray-900 text-white resize-none outline-none font-mono p-2 rounded w-full h-full"
              placeholder="Write your code here..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck="false"
            />
          </div>

          {/* Test Results & Actions */}
          <div className="flex-1 border border-amber-600 rounded-lg p-4 flex flex-col min-h-0">
            <span className="text-lg font-bold flex-shrink-0">Test Results</span>
            <div className="mt-2 flex-grow overflow-y-auto">
              {/* No real judge, so just show a message or fake result */}
              {isSubmitting && (
                <div className="flex items-center gap-2 text-amber-400">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-500"></div>
                  <span>Evaluating your solution...</span>
                </div>
              )}
              {submissionResults && (
                <div className="space-y-2">
                  {submissionResults.map((result, index) => {
                    const isAccepted = result.status.description === "Accepted";
                    const isError = result.status.id > 3;
                    return (
                      <div key={result.token || index} className={`p-2 rounded ${isAccepted ? "bg-green-800/50" : isError ? "bg-red-800/50" : "bg-yellow-800/50"}`}>
                        <p className="font-bold">
                          Test Case {index + 1}:{" "}
                          <span className={`${isAccepted ? "text-green-400" : isError ? "text-red-400" : "text-yellow-400"}`}>
                            {result.status.description}
                          </span>
                        </p>
                        {!isAccepted && (result.stderr || result.compile_output) && (
                          <pre className="text-xs text-red-300 mt-1 whitespace-pre-wrap bg-black/30 p-1 rounded">
                            {result.stderr || result.compile_output}
                          </pre>
                        )}
                        {result.time && (
                          <p className="text-xs text-gray-400 mt-1">
                            Time: {result.time}s | Memory: {result.memory}KB
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {/* Action Buttons */}
            <div className="flex justify-end gap-4 p-2 flex-shrink-0 mt-2">
              {/* <Button content="Resign" onClick={handleGoBack} /> */}
              {/* <Button content="Skip" onClick={handleNext} /> */}
              <Button content={isSubmitting ? "Submitting..." : "Submit"} onClick={handleSubmit}  />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}