"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSocket } from "@/contexts/SocketContext";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/shared/button";
import { Question, QuestionSession, QuestionManager, TestCase, sampleQuestions } from "@/types/question";
import Editor, { useMonaco } from '@monaco-editor/react';
import CustomScrollbar from "./CustomScrollbar";
import { showSuccessToast, showErrorToast, showInfoToast } from "./CustomToast";

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

interface CodePageProps {
  round: string;
}

export default function CodePage({ round }: CodePageProps) {
  // const { matchId } = useParams();
  const router = useRouter();
  // const { socket } = useSocket();
  // const { user } = useAuth();

  // Use sample question from the new question types
  const mockQuestion: Question = sampleQuestions[0];

  const [code, setCode] = useState(mockQuestion.boilerplate["javascript"]);
  const [language, setLanguage] = useState("javascript");
  const [timeLeft, setTimeLeft] = useState(mockQuestion.timeLimit); // Use question's time limit
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(mockQuestion);
  const [questionSession, setQuestionSession] = useState<QuestionSession | null>(
    QuestionManager.createQuestionSession(mockQuestion)
  );
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(1);
  const [matchStatus, setMatchStatus] = useState("PRACTICE");
  // const [match, setMatch] = useState<MatchData | null>(null);
  // const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResults, setSubmissionResults] = useState<SubmissionResult[] | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  
  // Resizable splitter state
  const [codeEditorHeight, setCodeEditorHeight] = useState(60); // percentage
  const [isDragging, setIsDragging] = useState(false);

  // Monaco editor configuration
  const editorOptions = {
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on' as const,
    roundedSelection: false,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    wordWrap: 'on' as const,
    bracketPairColorization: { enabled: true },
    autoIndent: 'full' as const,
    formatOnPaste: true,
    formatOnType: true,
  };

  // Get language mapping for Monaco
  const getMonacoLanguage = (lang: string) => {
    const languageMap: { [key: string]: string } = {
      'python': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
    };
    return languageMap[lang] || 'python';
  };

  // Custom Monaco theme configuration
  const monaco = useMonaco();
  
  useEffect(() => {
    if (monaco) {
      monaco.editor.defineTheme('custom-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '#6A9955' },
          { token: 'keyword', foreground: '#569CD6' },
          { token: 'string', foreground: '#CE9178' },
          { token: 'number', foreground: '#B5CEA8' },
        ],
        colors: {
          'editor.background': '#0a0a0a', // Very dark background
          'editor.foreground': '#ffffff',
          'editor.lineHighlightBackground': '#1a1a1a',
          'editor.selectionBackground': '#264f78',
          'editor.inactiveSelectionBackground': '#3a3d41',
          'editorCursor.foreground': '#f97316', // Orange cursor to match your theme
          'editorLineNumber.foreground': '#858585',
          'editorLineNumber.activeForeground': '#f97316', // Orange active line number
          'editor.selectionHighlightBackground': '#ADD6FF26',
          'editor.wordHighlightBackground': '#575757B8',
          'editorBracketMatch.background': '#0064001a',
          'editorBracketMatch.border': '#888888',
        },
      });
      // Set the theme immediately after defining it
      monaco.editor.setTheme('custom-dark');
    }
  }, [monaco]);

  // Resizable splitter handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const container = document.querySelector('.code-results-container') as HTMLElement;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const containerHeight = rect.height;
    const mouseY = e.clientY - rect.top;
    const newHeightPercentage = Math.max(20, Math.min(80, (mouseY / containerHeight) * 100));
    
    setCodeEditorHeight(newHeightPercentage);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  // Timer countdown effect
  useEffect(() => {
    if (!isTimerRunning || timeLeft <= 0 || !questionSession || !currentQuestion) return;

    const timer = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          setIsTimerRunning(false);
          // Update session status
          setQuestionSession(prev => prev ? { ...prev, status: 'timeout' } : null);
          console.log("Time's up!");
          alert("Time's up! The question will be auto-submitted.");
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimerRunning, timeLeft, questionSession, currentQuestion]);

  // Function to reset timer for new question
  const resetTimer = (newTimeLimit?: number) => {
    const timeLimit = newTimeLimit || currentQuestion?.timeLimit || 1800;
    setTimeLeft(timeLimit);
    setIsTimerRunning(true);
    if (currentQuestion) {
      setQuestionSession(QuestionManager.createQuestionSession(currentQuestion));
    }
  };

  // Function to pause/resume timer
  const toggleTimer = () => {
    setIsTimerRunning(prev => !prev);
  };

  // Function to save session to localStorage
  const saveSession = () => {
    if (questionSession && currentQuestion) {
      const sessionData = {
        ...questionSession,
        timeRemaining: timeLeft,
        currentCode: code,
        currentLanguage: language
      };
      localStorage.setItem(`question_session_${currentQuestion.id}`, JSON.stringify(sessionData));
    }
  };

  // Function to load session from localStorage
  const loadSession = (questionId: string) => {
    const savedSession = localStorage.getItem(`question_session_${questionId}`);
    if (savedSession) {
      const sessionData = JSON.parse(savedSession);
      setQuestionSession(sessionData);
      setTimeLeft(sessionData.timeRemaining);
      setCode(sessionData.currentCode || currentQuestion?.boilerplate[language] || "");
      setLanguage(sessionData.currentLanguage || "javascript");
      return true;
    }
    return false;
  };

  // Save session periodically
  useEffect(() => {
    const saveInterval = setInterval(saveSession, 30000); // Save every 30 seconds
    return () => clearInterval(saveInterval);
  }, [questionSession, timeLeft, code, language]);

  // Get timer display with color coding
  const getTimerDisplay = (): { time: string; className: string } => {
    if (!currentQuestion) return {
      time: QuestionManager.formatTime(timeLeft),
      className: 'border-amber-600'
    };
    
    const isWarning = QuestionManager.isTimeWarning(timeLeft, currentQuestion.timeLimit);
    const isCritical = QuestionManager.isTimeCritical(timeLeft, currentQuestion.timeLimit);
    
    return {
      time: QuestionManager.formatTime(timeLeft),
      className: isCritical ? 'border-red-600 text-red-400' : 
                 isWarning ? 'border-yellow-600 text-yellow-400' : 'border-amber-600'
    };
  };

  // Helper function to format input/output without brackets
  const formatTestCaseData = (data: any): string => {
    if (typeof data === 'string') {
      return data;
    }
    if (Array.isArray(data)) {
      return data.join(', ');
    }
    if (typeof data === 'object' && data !== null) {
      // For objects like {nums: [2, 7, 11, 15], target: 9}, format as key-value pairs
      const entries = Object.entries(data);
      return entries.map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key} = [${value.join(', ')}]`;
        }
        return `${key} = ${value}`;
      }).join('\n');
    }
    return String(data);
  };

  // Enhanced handleSubmit for client-only mode with session tracking
  function handleSubmit() {
    if (!currentQuestion || isSubmitting || !questionSession) return;
    
    // Show submission toast
    showInfoToast('Submitting your solution...');
    
    setIsSubmitting(true);
    
    // Update session attempts
    setQuestionSession(prev => prev ? { ...prev, attempts: prev.attempts + 1 } : null);
    
    setTimeout(() => {
      // Mock results - in real implementation, this would call the judge API
      const mockResults = [
        {
          token: "mock1",
          status: { id: 3, description: "Accepted" },
          stdout: JSON.stringify([0, 1]),
          stderr: null,
          compile_output: null,
          time: "0.01",
          memory: "1024",
        },
        {
          token: "mock2",
          status: { id: 6, description: "Wrong Answer" },
          stdout: JSON.stringify([1, 0]),
          stderr: null,
          compile_output: null,
          time: "0.01", 
          memory: "1024",
        },
      ];
      
      setSubmissionResults(mockResults);
      
      // Check if all test cases passed
      const allPassed = mockResults.every(result => result.status.description === "Accepted");
      
      if (allPassed) {
        setQuestionSession(prev => prev ? { 
          ...prev, 
          status: 'completed',
          endTime: new Date(),
          score: currentQuestion.points
        } : null);
        showSuccessToast("🎉 Congratulations! All test cases passed!");
      } else {
        showErrorToast("Some test cases failed. Keep trying!");
      }
      
      setIsSubmitting(false);
      saveSession(); // Save progress
    }, 1200);
  }

  return (
    <div className="flex flex-col h-screen  text-white overflow-hidden bg-[url('/bg-code.svg')]  bg-fixed bg-cover  bg-center oxanium">
      {/* Header and Timer */}
      {/* <div className="flex-shrink-0 flex items-center justify-between p-2 border-b border-gray-700">
        <h1 className="text-lg font-bold text-amber-400">Code Duel (Practice Mode)</h1>
        <div className="flex items-center gap-4">
            <div className="text-center text-sm">Question: {questionIndex + 1} / {totalQuestions}</div>
            <div className="text-center p-2 font-mono text-lg bg-gray-800 rounded">{formatTime(timeLeft)}</div>
        </div>
      </div> */}

      {/* Main Content */}
      <div className="flex-1 flex p-4 gap-4 bg-black/40  min-h-0">
        {/* Question Panel */}
        <CustomScrollbar className="w-1/2 flex border rounded-lg border-amber-600 bg-black/40 p-4 flex-col min-h-0 overflow-hidden glass-box">
          <div className="flex justify-between items-start mb-4 flex-shrink-0">
            <div>
              <h2 className="text-2xl font-bold">{currentQuestion!.title}</h2>
              <div className="flex gap-4 text-sm text-gray-400 mt-1">
                {/* <span className={`px-2 py-1 rounded ${QuestionManager.getDifficultyColor(currentQuestion!.difficulty)}`}>
                  {currentQuestion!.difficulty}
                </span> */}
                <span>Points: {currentQuestion!.points}</span>
                <span>Time: {Math.floor(currentQuestion!.timeLimit / 60)}min</span>
                <span>Round: {round}</span>
              </div>
            </div>
            <Button
              content={showHints ? "Hide" : "Hint💡"}
              onClick={() => setShowHints(!showHints)}
            />
          </div>
          
          <div className="flex-1 overflow-y-auto min-h-0 ">
            {showHints && (
              <div className="mb-4 bg-gray-800 p-3 rounded">
                <h3 className="font-bold mb-2 text-amber-400">Hints:</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-2">
                  {currentQuestion!.hints.map((hint, i) => <li key={i}>{hint}</li>)}
                </ul>
              </div>
            )}
            
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
                <pre className="bg-gray-900 p-2 rounded mt-1 whitespace-pre-wrap">{formatTestCaseData(testCase.input.stdin || testCase.input.json)}</pre>
                <p className="mt-2 font-bold text-gray-400">Output:</p>
                <pre className="bg-gray-900 p-2 rounded mt-1 whitespace-pre-wrap">{formatTestCaseData(testCase.output.stdout || testCase.output.json)}</pre>
                {testCase.explanation && <p className="mt-2 text-xs text-gray-400 italic">Explanation: {testCase.explanation}</p>}
              </div>
            ))}
          </div>
        </CustomScrollbar>

        {/* Code & Results Panel */}
        <div className="w-1/2 flex flex-col code-results-container border-amber-500" style={{ height: '100%' }}>
          {/* Code Editor */}
          <div 
            className="border border-amber-600 rounded-lg p-4 flex flex-col min-h-0"
            style={{ height: `${codeEditorHeight}%`, minHeight: '200px' }}
          >
            <div className="flex justify-between items-center mb-2 gap-50">
              <div className="flex-1 flex ">

                <select
                  value={language}
                  onChange={(e) => {
                    setLanguage(e.target.value);
                    setCode(mockQuestion.boilerplate[e.target.value] || "");
                  }}
                  className="bg-gray-800 flex-1 text-white p-2 rounded border border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 ml-1"
                >
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="c">C</option>
                </select>
                <div className={`bg-gray-800 flex-[0.7] text-white p-2 rounded border focus:outline-none focus:ring-2 focus:ring-amber-500 ml-1 text-center font-mono ${
                  getTimerDisplay().className
                }`}>
                  {getTimerDisplay().time}
                </div>
              </div>
              <div className="flex-1 flex">
                <button className="flex-1 flex justify-end h-fit bg-gray-800 text-white p-2 rounded border border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 ml-10">
                  <span className = "flex-1">Run</span> 
                  <img src = "/run.svg" className = "flex-1 h-6 w-6"/>
                </button>
                <button 
                  className="flex-1 justify-end h-fit items-end w-40 bg-gray-800 text-white p-2 rounded border border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 ml-1"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : `Submit`}
                </button>
              </div>
            </div>
            
            {/* Monaco Editor */}
            <div className="flex-1 rounded overflow-hidden border border-gray-700">
              <Editor
                height="100%"
                language={getMonacoLanguage(language)}
                value={code}
                onChange={(value) => setCode(value || "")}
                theme="custom-dark"
                options={editorOptions}
                loading={
                  <div className="flex items-center justify-center h-full bg-gray-900">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
                  </div>
                }
              />
            </div>
          </div>

          {/* Resizable Divider */}
          <div
            className={`h-1 bg-amber-600/20 hover:bg-amber-600/40 cursor-row-resize transition-colors duration-200 flex items-center justify-center ${
              isDragging ? 'bg-amber-600/60' : ''
            }`}
            onMouseDown={handleMouseDown}
          >
            <div className="w-8 h-1 bg-amber-600 rounded-full"></div>
          </div>

          {/* Test Results & Actions */}
          <div 
            className="border border-amber-600 rounded-lg p-4 flex flex-col min-h-0"
            style={{ height: `${100 - codeEditorHeight}%`, minHeight: '150px' }}
          >
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
          </div>
        </div>
      </div>
    </div>
  );
}
