"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSocket } from "@/contexts/SocketContext";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/shared/button";

interface Question {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  constraints: string[];
  hints: string[];
  boilerplate: Record<string, string>;
  sampleTestCases: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
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

  // Helper function to safely render test case values
  const renderTestCaseValue = (value: any): string => {
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "object" && value !== null) {
      return JSON.stringify(value);
    }
    return String(value);
  };

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

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Update code when language changes
  useEffect(() => {
    if (currentQuestion && currentQuestion.boilerplate) {
      setCode(currentQuestion.boilerplate[language] || "");
    }
  }, [language, currentQuestion]);

  const handleSubmit = () => {
    if (!socket || !matchId || !currentQuestion) return;

    console.log("Submitting answer for question:", currentQuestion.title);
    socket.emit("submitAnswer", {
      matchId,
      answer: code,
      questionIndex,
    });
  };

  const handleNext = () => {
    if (!socket || !matchId) return;

    console.log("Requesting next question");
    socket.emit("nextQuestion", { matchId });
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

  const handleGoBack = () => {
    router.push(`/play/${matchId}`);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-lg mb-2">Loading match...</p>
          <p className="text-sm text-gray-400">
            Match ID: {matchId || "Not available"}
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <h2 className="text-xl font-bold mb-2">❌ Error</h2>
            <p className="mb-4">{error}</p>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg mb-4 text-left text-sm">
            <p className="font-bold mb-2">Debug Information:</p>
            <p>Match ID: {matchId || "Not available"}</p>
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

  // No current question state
  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-lg mb-2">Waiting for question...</p>
          <p className="text-sm text-gray-400 mb-4">
            Match Status: {matchStatus}
          </p>
          {matchStatus === "READY" && (
            <p className="text-sm text-gray-400">
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

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-[0.2] items-center flex justify-center text-bold text-xl">
        PLAYER V/S PLAYER
      </div>
      <div className="flex-[0.4] flex flex-col p-4 rounded-lg">
        <div className="flex-3 rounded-lg border border-t-amber-500 border-b-amber-600 border-l-amber-500 border-r-amber-500 flex">
          <div className="flex-1 flex justify-center items-center">
            Current Points: 100
          </div>
          <div className="flex-1 flex justify-center items-center">
            Bonus Points: 20
          </div>
          <div className="flex-1 flex justify-center items-center">
            {formatTime(timeLeft)}
          </div>
        </div>
        <div className="flex h-3 w-full rounded-lg bg-black border-red-500 border-2">
          <div className="bg-yellow-400 rounded-lg w-1/2 border"></div>
          <div className="bg-red-400 rounded-lg h-1 w-1/2 absolute blur-md"></div>
        </div>
      </div>
      <div className="flex-4 flex p-4 gap-4 bg-black/40 backdrop-blur-sm">
        {/* Question Panel */}
        <div className="flex-1 flex border rounded-lg border-amber-600 bg-black/40 backdrop-blur-sm p-4 flex-col">
          <span className="text-lg mb-4">{currentQuestion.title}</span>
          <p className="mb-4">{currentQuestion.description}</p>

          {currentQuestion.constraints?.length > 0 && (
            <div className="mb-4">
              <h3 className="font-bold mb-1">Constraints:</h3>
              <ul className="list-disc pl-5">
                {currentQuestion.constraints.map((constraint, i) => (
                  <li key={i}>{constraint}</li>
                ))}
              </ul>
            </div>
          )}

          {currentQuestion.sampleTestCases?.length > 0 && (
            <div className="mb-4">
              <h3 className="font-bold mb-1">Sample Test Cases:</h3>
              {currentQuestion.sampleTestCases.map((testCase, i) => (
                <div key={i} className="mb-2 bg-black/30 p-2 rounded">
                  <p>
                    <span className="font-bold">Input:</span>{" "}
                    {renderTestCaseValue(testCase.input)}
                  </p>
                  <p>
                    <span className="font-bold">Output:</span>{" "}
                    {renderTestCaseValue(testCase.output)}
                  </p>
                  {testCase.explanation && (
                    <p>
                      <span className="font-bold">Explanation:</span>{" "}
                      {testCase.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {currentQuestion.hints?.length > 0 && (
            <div>
              <h3 className="font-bold mb-1">Hints:</h3>
              <ul className="list-disc pl-5">
                {currentQuestion.hints.map((hint, i) => (
                  <li key={i}>{hint}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Code Editor Panel */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex-1 border border-amber-600 rounded-lg p-4 flex flex-col">
            <div className="flex justify-between mb-2">
              <span className="text-lg">CODE</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-black/40 text-white p-1 rounded border border-amber-600"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
                <option value="c">C</option>
              </select>
            </div>
            <textarea
              className="flex-1 bg-transparent text-white resize-none outline-none font-mono"
              placeholder="Write your code here..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div className="flex-1 border border-amber-600 rounded-lg p-4">
            <span className="text-lg">TEST RESULT</span>
          </div>
          <div className="flex-[0.1] gap-2 p-2 flex justify-end">
            <Button content="Resign" onClick={handleGoBack} />
            <Button content="Skip" onClick={handleNext} />
            <Button content="Submit" onClick={handleSubmit} />
          </div>
        </div>
      </div>
    </div>
  );
}
