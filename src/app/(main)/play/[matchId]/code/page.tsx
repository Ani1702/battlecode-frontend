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
  const { matchId } = useParams();
  const router = useRouter();
  const { socket } = useSocket();
  const { user } = useAuth();

  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [matchStatus, setMatchStatus] = useState("LOADING");
  const [match, setMatch] = useState<MatchData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResults, setSubmissionResults] = useState<SubmissionResult[] | null>(null);
  const [showHints, setShowHints] = useState(false);


  useEffect(() => {
    if (!socket || !matchId || !user) return;

    const initializeMatch = async () => {
      setLoading(true);
      setError("");

      try {
        socket.emit("joinRoom", { matchId }, (response: any) => {
          if (!response?.success) {
            setError(response?.error || "Failed to join match room");
            setLoading(false);
            return;
          }

          socket.emit("getMatch", { matchId }, (response: any) => {
            setLoading(false);
            if (response?.error) {
              setError(response.error);
              return;
            }

            if (response?.match) {
              setMatch(response.match);
              setMatchStatus(response.match.status);
              setTotalQuestions(response.match.settings?.noOfQuestions || 0);

              if (
                response.match.status === "IN_PROGRESS" &&
                response.match.questions?.length > 0
              ) {
                const questionIdx = response.match.currentQuestionIndex || 0;
                const question = response.match.questions[questionIdx];

                if (question) {
                  setCurrentQuestion(question);
                  setQuestionIndex(questionIdx);
                  setCode(question.boilerplate?.[language] || "");

                  if (response.match.startedAt) {
                    const startTime = new Date(response.match.startedAt).getTime();
                    const currentTime = new Date().getTime();
                    const elapsedMinutes = (currentTime - startTime) / (1000 * 60);
                    const totalTimeMinutes = response.match.settings.timeLimit;
                    const remainingMinutes = Math.max(
                      0,
                      totalTimeMinutes - elapsedMinutes
                    );
                    setTimeLeft(Math.floor(remainingMinutes * 60));
                  }
                }
              }
            } else {
              setError("Match data not found");
            }
          });
        });
      } catch (err) {
        setError("Failed to initialize match");
        setLoading(false);
      }
    };

    initializeMatch();

    const handleMatchStarted = (data: {
      matchId: string;
      startTime: string;
      timeLimit: number;
      question: Question;
      questionIndex: number;
      totalQuestions: number;
    }) => {
      setCurrentQuestion(data.question);
      setQuestionIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
      setTimeLeft(data.timeLimit * 60);
      setMatchStatus("IN_PROGRESS");
      setCode(data.question.boilerplate?.[language] || "");
      setError("");
      setShowHints(false);
    };

    const handleNextQuestion = (data: {
      matchId: string;
      question: Question;
      questionIndex: number;
      timeRemaining: number;
    }) => {
      setCurrentQuestion(data.question);
      setQuestionIndex(data.questionIndex);
      setTimeLeft(data.timeRemaining);
      setCode(data.question.boilerplate?.[language] || "");
      setShowHints(false);
      setSubmissionResults(null);
    };

    const handleMatchCompleted = () => {
      setMatchStatus("COMPLETED");
      router.push(`/results/${matchId}`);
    };

    socket.on("matchStarted", handleMatchStarted);
    socket.on("nextQuestion", handleNextQuestion);
    socket.on("matchCompleted", handleMatchCompleted);

    return () => {
      socket.off("matchStarted", handleMatchStarted);
      socket.off("nextQuestion", handleNextQuestion);
      socket.off("matchCompleted", handleMatchCompleted);
    };
  }, [socket, matchId, user, router, language]);

  useEffect(() => {
    if (timeLeft <= 0 && matchStatus === 'IN_PROGRESS') {
        // Handle time running out, e.g., auto-submit or end match
        // For now, it just stops the timer.
        return;
    }
    const timer = setInterval(
      () => setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0)),
      1000
    );
    return () => clearInterval(timer);
  }, [timeLeft, matchStatus]);

  useEffect(() => {
    if (currentQuestion?.boilerplate) {
      setCode(currentQuestion.boilerplate[language] || "");
    }
    // Reset submission results when language changes
    setSubmissionResults(null);
  }, [language, currentQuestion]);

  const handleSubmit = async () => {
    if (!currentQuestion || isSubmitting) return;

    setIsSubmitting(true);
    setSubmissionResults(null);

    try {
      // Determine if the selected language uses JSON for I/O based on boilerplate
      const isJsonLanguage = ["javascript", "python"].includes(language);

      // Prepare test cases for Judge0 batch submission
      // FIX: Add fallback '|| []' to prevent "not iterable" error if test cases are missing.
      const testCases = [
        ...(currentQuestion.sampleTestCases || []),
        ...(currentQuestion.hiddenTestCases || []),
      ].map(testCase => {
        // Select the correct input format (stdin string or JSON string)
        const stdin = isJsonLanguage ? testCase.input.json : testCase.input.stdin;

        // Select and format the expected output
        const expected_output = isJsonLanguage
          ? JSON.stringify(testCase.output.json)
          : testCase.output.stdout;

        return {
          stdin: stdin || "",
          expected_output: expected_output || "",
        };
      });

      const response = await fetch("http://localhost:8000/api/submit/execute-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          source_code: code,
          test_cases: testCases,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Submission failed");
      }

      const { results } = await response.json();
      setSubmissionResults(results);

      // Check if all test cases passed
      const allPassed = results.every(
        (res: SubmissionResult) => res.status.description === "Accepted"
      );

      if (allPassed && socket) {
        socket.emit("submitAnswer", {
          matchId,
          questionIndex,
          timeTaken: (match?.settings.timeLimit || 0) * 60 - timeLeft, 
        });
      }
    } catch (err: any) {
      console.error("Submission error:", err);
      setSubmissionResults([
        {
          token: "error",
          status: { id: 6, description: "Execution Error" },
          stderr: err.message,
          stdout: null,
          compile_output: null,
          time: null,
          memory: null,
        },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (!socket || !matchId) return;
    socket.emit("nextQuestion", { matchId });
  };

  const handleGoBack = () => {
    router.push(`/play/${matchId}`);
  };

  const handleRetry = () => {
    window.location.reload();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-lg mb-2">Loading match...</p>
          <p className="text-sm text-gray-400">Match ID: {matchId || "N/A"}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-white">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <h2 className="text-xl font-bold mb-2">❌ Match Error</h2>
            <p className="mb-4">{error}</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg mb-4 text-left text-sm">
            <p className="font-bold mb-2">Debug Info:</p>
            <p>Match ID: {matchId || "N/A"}</p>
            <p>User ID: {user?.id || "Not logged in"}</p>
            <p>Socket Connected: {socket ? "Yes" : "No"}</p>
            <p>Match Status: {matchStatus}</p>
          </div>
          <div className="space-x-4">
            <Button content="Retry" onClick={handleRetry} />
            <Button content="Go Back" onClick={handleGoBack} />
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center h-full text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-lg mb-2">Waiting for the match to start...</p>
          <p className="text-sm text-gray-400 mb-4">Status: {matchStatus}</p>
          <div className="mt-4">
            <Button content="Go Back" onClick={handleGoBack} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header and Timer */}
      <div className="flex-shrink-0 flex items-center justify-between p-2 border-b border-gray-700">
        <h1 className="text-lg font-bold text-amber-400">Code Duel</h1>
        <div className="flex items-center gap-4">
            <div className="text-center text-sm">Question: {questionIndex + 1} / {totalQuestions}</div>
            <div className="text-center p-2 font-mono text-lg bg-gray-800 rounded">{formatTime(timeLeft)}</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-grow flex p-4 gap-4 bg-black/40 backdrop-blur-sm overflow-hidden">
        {/* Question Panel */}
        <div className="w-1/2 flex border rounded-lg border-amber-600 bg-black/40 p-4 flex-col overflow-y-auto">
          <h2 className="text-2xl font-bold mb-4">{currentQuestion.title}</h2>
          <p className="mb-4 text-gray-300 whitespace-pre-wrap">{currentQuestion.description}</p>
          
          <h3 className="font-bold mb-2 text-amber-400">Constraints:</h3>
          <ul className="list-disc list-inside mb-4 text-gray-300 font-mono text-sm">
            {currentQuestion.constraints.map((constraint, i) => (
                <li key={i}>{constraint}</li>
            ))}
          </ul>
          
          <h3 className="font-bold mb-4 text-amber-400">Sample Cases:</h3>
          {currentQuestion.sampleTestCases.map((testCase, i) => (
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
                      {currentQuestion.hints.map((hint, i) => <li key={i}>{hint}</li>)}
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
                onChange={(e) => setLanguage(e.target.value)}
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
                    const isError = result.status.id > 3; // Any status other than Queue, Processing, Accepted
                    
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
              <Button content="Resign" onClick={handleGoBack} />
              <Button content="Skip" onClick={handleNext} />
              <Button content={isSubmitting ? "Submitting..." : "Submit"} onClick={handleSubmit}  />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}