"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSocket } from "@/contexts/SocketContext";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/shared/button";

// --- INTERFACES ---
interface TestCase {
  // FIX: Changed from string to any to match the actual data structure (e.g., objects, arrays)
  input: any;
  output: any;
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

// --- COMPONENT ---
export default function CodeRoom() {
  const { matchId } = useParams();
  const router = useRouter();
  const { socket } = useSocket();
  const { user } = useAuth();

  // Component State
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

  // --- NEW STATE FOR SUBMISSION ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResults, setSubmissionResults] = useState<any[] | null>(
    null
  );

  // Helper function to safely render test case values
  const renderTestCaseValue = (value: any): string => {
    if (typeof value === "string") return value;
    if (typeof value === "object" && value !== null)
      return JSON.stringify(value);
    return String(value);
  };

  // Main effect for joining match and setting up listeners
  useEffect(() => {
    if (!socket) {
      console.log("Socket not available yet");
      return;
    }

    if (!matchId) {
      console.log("Match ID not available yet");
      setError("Match ID is required");
      setLoading(false);
      return;
    }

    if (!user) {
      console.log("User not authenticated yet");
      return;
    }

    console.log("Initializing with matchId:", matchId);
    setLoading(true);
    setError("");

    // First, join the room
    socket.emit("joinRoom", { matchId }, (response: any) => {
      console.log("Join room response:", response);
      if (!response?.success) {
        setError(response?.error || "Failed to join match room");
        setLoading(false);
        return;
      }

      // Then get the match data
      socket.emit("getMatch", { matchId }, (response: any) => {
        console.log("Get match response:", response);
        setLoading(false);

        if (response?.error) {
          console.log("Error getting match:", response.error);
          setError(response.error);
          return;
        }

        if (response?.match) {
          console.log("Match data received:", response.match);
          setMatch(response.match);
          setMatchStatus(response.match.status);
          setTotalQuestions(response.match.settings?.noOfQuestions || 0);

          // If match is already in progress and has questions, set up the current question
          if (
            response.match.status === "IN_PROGRESS" &&
            response.match.questions?.length > 0
          ) {
            const questionIdx = response.match.currentQuestionIndex || 0;
            const question = response.match.questions[questionIdx];

            if (question) {
              console.log("Setting current question:", question.title);
              setCurrentQuestion(question);
              setQuestionIndex(questionIdx);
              setCode(question.boilerplate?.[language] || "");

              // Calculate time remaining if match has started
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

    // Socket event handlers
    const handleMatchStarted = (data: {
      matchId: string;
      startTime: string;
      timeLimit: number;
      question: Question;
      questionIndex: number;
      totalQuestions: number;
    }) => {
      console.log("Match started event received:", data);
      setCurrentQuestion(data.question);
      setQuestionIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
      setTimeLeft(data.timeLimit * 60); // Convert minutes to seconds
      setMatchStatus("IN_PROGRESS");
      setCode(data.question.boilerplate?.[language] || "");
      setError("");
    };

    const handleNextQuestion = (data: {
      matchId: string;
      question: Question;
      questionIndex: number;
      timeRemaining: number;
    }) => {
      console.log("Next question event received:", data);
      setCurrentQuestion(data.question);
      setQuestionIndex(data.questionIndex);
      setTimeLeft(data.timeRemaining);
      setCode(data.question.boilerplate?.[language] || "");
    };

    const handleMatchCompleted = () => {
      console.log("Match completed event received");
      setMatchStatus("COMPLETED");
      router.push(`/results/${matchId}`);
    };

    // Set up event listeners
    socket.on("matchStarted", handleMatchStarted);
    socket.on("nextQuestion", handleNextQuestion);
    socket.on("matchCompleted", handleMatchCompleted);

    return () => {
      console.log("Cleaning up socket listeners");
      socket.off("matchStarted", handleMatchStarted);
      socket.off("nextQuestion", handleNextQuestion);
      socket.off("matchCompleted", handleMatchCompleted);
    };
  }, [socket, matchId, user, router, language]);

  // Timer effect
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(
      () => setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0)),
      1000
    );
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Update code when language changes
  useEffect(() => {
    if (currentQuestion?.boilerplate) {
      setCode(currentQuestion.boilerplate[language] || "");
    }
  }, [language, currentQuestion]);

  // --- UPDATED SUBMIT HANDLER ---
  const handleSubmit = async () => {
    if (!currentQuestion || isSubmitting) return;

    setIsSubmitting(true);
    setSubmissionResults(null); // Clear previous results

    // Combine sample and hidden test cases for submission
    const allTestCases = [
      ...(currentQuestion.sampleTestCases || []),
      ...(currentQuestion.hiddenTestCases || []),
    ];

    try {
      // NOTE: Make sure this URL points to your running backend server.
      // It's best to use an environment variable for this in a real app.
      const response = await fetch("http://localhost:8000/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: language,
          source_code: code,
          testCases: allTestCases,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Submission failed");
      }

      const data = await response.json();
      setSubmissionResults(data.results);

      // Optional: If all test cases passed, emit a socket event to update score
      const allPassed = data.results.every(
        (res: any) => res.status.description === "Accepted"
      );
      if (allPassed && socket) {
        console.log("All test cases passed! Emitting score update.");
        socket.emit("submitAnswer", {
          matchId,
          questionIndex,
          // You can add more data here like time taken, etc.
        });
      }
    } catch (err: any) {
      console.error("Submission error:", err);
      // Display a user-friendly error in the results panel
      setSubmissionResults([
        { status: { description: "Error" }, stderr: err.message },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (!socket || !matchId) return;
    console.log("Requesting next question");
    socket.emit("nextQuestion", { matchId });
  };

  const handleGoBack = () => {
    router.push(`/play/${matchId}`);
  };

  const handleRetry = () => {
    if (!socket || !matchId) return;

    console.log("Retrying match data fetch");
    setLoading(true);
    setError("");

    socket.emit("getMatch", { matchId }, (response: any) => {
      console.log("Retry get match response:", response);
      setLoading(false);

      if (response?.match) {
        setMatch(response.match);
        setMatchStatus(response.match.status);

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
          }
        }
      } else if (response?.error) {
        setError(response.error);
      } else {
        setError("Failed to retrieve match data");
      }
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // --- RENDER LOGIC ---
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-lg mb-2 font-oxanium">Loading match...</p>
          <p className="text-sm text-gray-400 font-oxanium">
            Match ID: {matchId || "Not available"}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <h2 className="text-xl font-bold mb-2 font-oxanium">❌ Error</h2>
            <p className="mb-4 font-oxanium">{error}</p>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg mb-4 text-left text-sm">
            <p className="font-bold mb-2 font-oxanium">Debug Information:</p>
            <p className="font-oxanium">Match ID: {matchId || "Not available"}</p>
            <p className="font-oxanium">User ID: {user?.id || "Not logged in"}</p>
            <p className="font-oxanium">Socket Connected: {socket ? "Yes" : "No"}</p>
            <p className="font-oxanium">Match Status: {matchStatus}</p>
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
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-lg mb-2 font-oxanium">Waiting for question...</p>
          <p className="text-sm text-gray-400 mb-4 font-oxanium">
            Match Status: {matchStatus}
          </p>
          {matchStatus === "READY" && (
            <p className="text-sm text-gray-400 font-oxanium">
              Waiting for the match to start...
            </p>
          )}
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
      <div className="flex-[0.2] items-center flex justify-center text-bold text-xl">
        PLAYER V/S PLAYER
      </div>
      <div className="flex-[0.4] flex flex-col p-4 rounded-lg">
        <div className="flex-3 rounded-lg border border-amber-500 flex">
          <div className="flex-1 text-center p-2">Current Points: 100</div>
          <div className="flex-1 text-center p-2">Bonus Points: 20</div>
          <div className="flex-1 text-center p-2 font-mono text-lg">
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-4 flex p-4 gap-4 bg-black/40 backdrop-blur-sm overflow-auto">
        {/* Question Panel */}
        <div className="flex-1 flex border rounded-lg border-amber-600 bg-black/40 p-4 flex-col overflow-y-auto">
          <h2 className="text-xl font-bold mb-4">{currentQuestion.title}</h2>
          <p className="mb-4 text-gray-300">{currentQuestion.description}</p>

          <h3 className="font-bold mb-2">Sample Test Cases:</h3>
          {currentQuestion.sampleTestCases.map((testCase, i) => (
            <div
              key={i}
              className="mb-2 bg-gray-800 p-3 rounded font-mono text-sm"
            >
              <p>
                <span className="font-bold text-gray-400">Input:</span>{" "}
                {renderTestCaseValue(testCase.input)}
              </p>
              <p>
                <span className="font-bold text-gray-400">Output:</span>{" "}
                {renderTestCaseValue(testCase.output)}
              </p>
            </div>
          ))}
        </div>

        {/* Code & Results Panel */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Code Editor */}
          <div className="flex-1 border border-amber-600 rounded-lg p-4 flex flex-col">
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
              className="flex-1 bg-gray-900 text-white resize-none outline-none font-mono p-2 rounded"
              placeholder="Write your code here..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>

          {/* Test Results */}
          <div className="flex-1 border border-amber-600 rounded-lg p-4 overflow-y-auto">
            <span className="text-lg font-bold">Test Results</span>
            <div className="mt-2">
              {isSubmitting && (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-500"></div>
                  <span>Evaluating...</span>
                </div>
              )}
              {submissionResults && (
                <div className="space-y-2">
                  {submissionResults.map((result, index) => {
                    const isAccepted = result.status.description === "Accepted";
                    return (
                      <div
                        key={index}
                        className={`p-2 rounded ${
                          isAccepted ? "bg-green-800/50" : "bg-red-800/50"
                        }`}
                      >
                        <p className="font-bold">
                          Test Case {index + 1}:{" "}
                          <span
                            className={
                              isAccepted ? "text-green-400" : "text-red-400"
                            }
                          >
                            {result.status.description}
                          </span>
                        </p>
                        {!isAccepted && result.stderr && (
                          <pre className="text-xs text-red-300 mt-1 whitespace-pre-wrap">
                            {result.stderr}
                          </pre>
                        )}
                        {!isAccepted && result.compile_output && (
                          <pre className="text-xs text-yellow-300 mt-1 whitespace-pre-wrap">
                            {result.compile_output}
                          </pre>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 p-2">
            <Button
              content="Resign"
              onClick={handleGoBack}
              // disabled={isSubmitting}
            />
            <Button
              content="Skip"
              onClick={handleNext}
              // disabled={isSubmitting}
            />
            <Button
              content={isSubmitting ? "Submitting..." : "Submit"}
              onClick={handleSubmit}
              // disabled={isSubmitting}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
