"use client";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/contexts/SocketContext";
import { useAuth } from "@/contexts/AuthContext";
import Editor from '@monaco-editor/react';
import { showSuccessToast, showErrorToast, showInfoToast } from '@/components/shared/CustomToast';
import { Save, CheckCircle, AlertTriangle } from "lucide-react";

// --- Interfaces ---
interface MatchData {
  opponent: { id: string; rank?: number; };
  question: {
    id: string; title: string; description: string; difficulty: string;
    duration?: number; constraints?: string[]; boilerplate?: { [key: string]: string };
    sampleTestCases?: TestCase[]; hints?: string[];
  };
  startTime: number; duration: number; difficulty?: string;
}

interface TestCase {
  stdin?: string; expected_output?: string;
  input?: { stdin?: string; json?: unknown; };
  output?: { stdout?: string; json?: unknown; };
  explanation?: string;
}

interface SubmissionResult {
  token: string; status: { id: number; description: string; };
  stdout: string | null; stderr: string | null; compile_output: string | null;
  time: string | null; memory: string | null; passed?: boolean;
}

interface CodePageProps {
  matchData: MatchData | null;
  timeRemaining: number;
}

interface CodeContext {
  round: string;
  questionId: string;
  language: string;
}

interface CodeStore {
  [contextKey: string]: string;
}

function CodePageComponent({ matchData, timeRemaining }: CodePageProps) {
  const { session } = useAuth();
  
  const [problem, setProblem] = useState<MatchData['question'] | null>(null);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState(() => {
    try {
      return localStorage.getItem('battlecode-round-1-language') || "python";
    } catch {
      return "python";
    }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [submissionResults, setSubmissionResults] = useState<SubmissionResult[] | null>(null);
  
  const [currentContext, setCurrentContext] = useState<CodeContext | null>(null);
  const [codeStore, setCodeStore] = useState<CodeStore>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isContextInitialized, setIsContextInitialized] = useState(false);
  
  const codeRef = useRef(code);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => { codeRef.current = code; }, [code]);
  useEffect(() => { localStorage.setItem('battlecode-round-1-language', language); }, [language]);

  const contextManager = useMemo(() => ({
    getStorageKey: (round: string) => `battlecode-round-${round}-code-store`,
    generateContextKey: (round: string, qId: string, lang: string) => `${round}:${qId}:${lang}`,
    loadCodeStore: (round: string): CodeStore => {
      try {
        const stored = localStorage.getItem(contextManager.getStorageKey(round));
        return stored ? JSON.parse(stored) : {};
      } catch { return {}; }
    },
    saveCodeStore: (round: string, store: CodeStore) => {
      try {
        localStorage.setItem(contextManager.getStorageKey(round), JSON.stringify(store));
        return true;
      } catch { return false; }
    },
    getBoilerplate: (p: MatchData['question'] | null, lang: string) => p?.boilerplate?.[lang] || '',
    createContext: (round: string, qId: string, lang: string) => ({ round, questionId: qId, language: lang }),
    contextEquals: (a: CodeContext | null, b: CodeContext | null) => a && b && a.round === b.round && a.questionId === b.questionId && a.language === b.language,
    getCodeForContext: (store: CodeStore, context: CodeContext) => store[contextManager.generateContextKey(context.round, context.questionId, context.language)] || '',
    setCodeForContext: (store: CodeStore, context: CodeContext, newCode: string) => {
      const key = contextManager.generateContextKey(context.round, context.questionId, context.language);
      return { ...store, [key]: newCode };
    },
  }), []);
  
  const scheduleAutoSave = useCallback(() => {
    if (!currentContext || !codeRef.current) return;
    const codeToSave = codeRef.current;
    const boilerplate = contextManager.getBoilerplate(problem, currentContext.language);
    if (codeToSave === boilerplate) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    setSaveStatus('saving');
    saveTimeoutRef.current = setTimeout(() => {
      setCodeStore(prev => {
        const updatedStore = contextManager.setCodeForContext(prev, currentContext, codeToSave);
        const success = contextManager.saveCodeStore('1', updatedStore);
        setSaveStatus(success ? 'saved' : 'error');
        setTimeout(() => setSaveStatus('idle'), 2000);
        return updatedStore;
      });
    }, 600);
  }, [currentContext, problem, contextManager]);
  
  useEffect(() => {
    if (isContextInitialized && code && currentContext) scheduleAutoSave();
  }, [code, isContextInitialized, currentContext, scheduleAutoSave]);

  const handleContextTransition = useCallback((newProblem: MatchData['question'], newLanguage: string) => {
    const newContext = contextManager.createContext('1', newProblem.id, newLanguage);
    if (contextManager.contextEquals(currentContext, newContext)) return;
    
    if (currentContext) {
        const currentCode = codeRef.current;
        const boilerplate = contextManager.getBoilerplate(problem, currentContext.language);
        if (currentCode && currentCode !== boilerplate) {
            setCodeStore(prev => {
                const updated = contextManager.setCodeForContext(prev, currentContext, currentCode);
                contextManager.saveCodeStore('1', updated);
                return updated;
            });
        }
    }

    const savedCode = contextManager.getCodeForContext(codeStore, newContext);
    const newBoilerplate = contextManager.getBoilerplate(newProblem, newLanguage);
    setCode(savedCode || newBoilerplate);
    setCurrentContext(newContext);
    setSubmissionResults(null);
  }, [currentContext, problem, codeStore, contextManager]);

  useEffect(() => {
    if (!matchData?.question || isContextInitialized) return;
    const loadedStore = contextManager.loadCodeStore('1');
    setCodeStore(loadedStore);
    const initialContext = contextManager.createContext('1', matchData.question.id, language);
    setCurrentContext(initialContext);
    const savedCode = contextManager.getCodeForContext(loadedStore, initialContext);
    const boilerplate = contextManager.getBoilerplate(matchData.question, language);
    setCode(savedCode || boilerplate);
    setProblem(matchData.question);
    setIsContextInitialized(true);
  }, [matchData, language, isContextInitialized, contextManager]);

  useEffect(() => {
    if (isContextInitialized && matchData?.question) {
        handleContextTransition(matchData.question, language);
    }
  }, [language, isContextInitialized, matchData, handleContextTransition]);

  const handleSubmit = useCallback(async (isFinalSubmission: boolean) => {
    if (!problem || !matchData || (isSubmitting || isRunning)) return;
    if (isFinalSubmission) {
      setIsSubmitting(true);
    } else {
      setIsRunning(true);
    }
    setSubmissionResults(null);
    showInfoToast(isFinalSubmission ? 'Submitting for final judging...' : 'Running against sample cases...');

    const endpoint = isFinalSubmission ? '/submit' : '/run';
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ language, source_code: code, problemId: problem.id, roundNumber: 1 })
      });
      const result = await response.json();
      if (result.success) {
        setSubmissionResults(result.results || []);
        if (isFinalSubmission) {
            if (result.submission?.status === 'ACCEPTED') showSuccessToast(`🎉 All test cases passed! You won!`);
            else showErrorToast(`${result.summary.passed}/${result.summary.total} test cases passed.`);
        } else {
            showInfoToast(`Test run completed: ${result.summary.passed}/${result.summary.total} passed`);
        }
      } else { throw new Error(result.message || 'Request failed'); }
    } catch (error) {
      showErrorToast(`Failed to ${isFinalSubmission ? 'submit' : 'run'}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (isFinalSubmission) {
        setIsSubmitting(false);
      } else {
        setIsRunning(false);
      }
    }
  }, [problem, matchData, session, language, code, isSubmitting, isRunning]);

  const getSaveStatusDisplay = () => {
    if (!currentContext) return { text: '', className: '', icon: null };
    switch (saveStatus) {
      case 'saving': return { text: 'Saving...', className: 'text-yellow-400', icon: <Save className="h-3 w-3" /> };
      case 'saved': return { text: 'Saved', className: 'text-green-400', icon: <CheckCircle className="h-3 w-3" /> };
      case 'error': return { text: 'Save Error', className: 'text-red-400', icon: <AlertTriangle className="h-3 w-3" /> };
      default:
        const savedCode = contextManager.getCodeForContext(codeStore, currentContext);
        return savedCode ? { text: 'Saved', className: 'text-green-400', icon: <CheckCircle className="h-3 w-3" /> } : { text: '', icon: null };
    }
  };

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  const getTimerDisplay = () => ({
    time: formatTime(timeRemaining),
    className: timeRemaining <= 60 ? 'border-red-600 text-red-400' : timeRemaining <= 300 ? 'border-yellow-600 text-yellow-400' : 'border-amber-600'
  });

  if (!problem || !matchData) return <div className="text-white text-center p-8">Initializing editor...</div>;

  return (
    <div className="flex flex-col h-screen text-white overflow-hidden bg-[url('/bg-code.svg')] bg-fixed bg-cover bg-center oxanium">
        <div className="flex-shrink-0 flex items-center justify-between p-4 bg-black/60 backdrop-blur-sm border-b border-amber-600">
            <div>
                <h1 className="text-xl font-bold text-amber-400">Round 1 - Coding Duel</h1>
                <div className="text-sm text-gray-300">
                    vs {matchData.opponent.id} | Difficulty: {problem.difficulty || 'Medium'}
                </div>
            </div>
            <div className={`text-center p-3 font-mono text-xl bg-gray-800 rounded border ${getTimerDisplay().className} flex items-center justify-center gap-2`}>
                <span>{getTimerDisplay().time}</span>
                {getSaveStatusDisplay().text && (
                  <span className={`text-xs ${getSaveStatusDisplay().className} flex items-center gap-1`}>
                    {getSaveStatusDisplay().icon}
                    {getSaveStatusDisplay().text}
                  </span>
                )}
            </div>
        </div>
        <div className="flex-1 flex p-4 gap-4 bg-black/40 min-h-0">
          <div className="w-1/2 flex flex-col border rounded-lg border-amber-600 bg-black/40 p-4">
              <h2 className="text-2xl font-bold">{problem.title}</h2>
              <div className="flex-1 overflow-y-auto mt-4">
                  <p className="whitespace-pre-wrap">{problem.description}</p>
              </div>
          </div>
          <div className="w-1/2 flex flex-col gap-4">
              <div className="flex-1 flex flex-col border rounded-lg border-amber-600 bg-black/40 p-4">
                  <div className="flex justify-between items-center mb-2">
                    <select value={language} onChange={(e) => setLanguage(e.target.value)} className="bg-gray-800 text-white p-2 rounded border border-amber-600">
                        <option value="python">Python</option>
                        <option value="java">Java</option>
                        <option value="cpp">C++</option>
                        <option value="javascript">JavaScript</option>
                    </select>
                    <div className="flex gap-2">
                        <button className="rounded-lg border p-4 h-12 text-white border-amber-600 font-oxanium w-30 justify-center items-center flex bg-black/20 backdrop-blur-sm hover:bg-amber-600 hover:text-black transition-colors duration-300 shadow-[0_0_20px_rgba(220,38,38,0.3)] disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => handleSubmit(false)} disabled={isRunning || isSubmitting}>Run</button>
                        <button className="rounded-lg border p-4 h-12 text-white border-amber-600 font-oxanium w-30 justify-center items-center flex bg-black/20 backdrop-blur-sm hover:bg-amber-600 hover:text-black transition-colors duration-300 shadow-[0_0_20px_rgba(220,38,38,0.3)] disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => handleSubmit(true)} disabled={isSubmitting || isRunning}>Submit</button>
                    </div>
                  </div>
                  <div className="flex-1 rounded overflow-hidden">
                    <Editor height="100%" language={language} value={code} onChange={(value) => setCode(value || "")} theme="vs-dark" />
                  </div>
              </div>
              <div className="h-1/3 flex flex-col border rounded-lg border-amber-600 bg-black/40 p-4">
                  <h3 className="text-lg font-bold">Test Results</h3>
                  <div className="flex-1 mt-2 overflow-y-auto">
                      {(isRunning || isSubmitting) && <p>Processing...</p>}
                      {submissionResults && submissionResults.map((result, index) => (
                          <div key={index} className={`p-2 rounded ${result.status.description === 'Accepted' ? 'bg-green-800/50' : 'bg-red-800/50'}`}>
                              Test Case {index + 1}: {result.status.description}
                          </div>
                      ))}
                  </div>
              </div>
          </div>
        </div>
    </div>
  );
}

// ============================================================================
// Main Wrapper Component (Default Export)
// This component handles all socket communication and state management for the page.
// ============================================================================
export default function R1CodePage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { socket, isConnected } = useSocket();
  
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [pageIsLoading, setPageIsLoading] = useState(true);
  
  const [showMatchEndPopup, setShowMatchEndPopup] = useState(false);
  const [matchEndData, setMatchEndData] = useState<{type: 'win' | 'lose' | 'timeout', message?: string} | null>(null);

  useEffect(() => {
    if (!socket || !isConnected) return;
    
    const handleTimerUpdate = (data: { timeRemaining: number }) => setTimeRemaining(data.timeRemaining || 0);
    const handleMatchResumed = () => showSuccessToast("Opponent reconnected. Match resumed!");
    const handleMatchPaused = () => showInfoToast("Opponent disconnected. The timer has paused.");
    
    const handleMatchEnd = (data: {type: 'win' | 'lose' | 'timeout'}) => {
      sessionStorage.removeItem('round1_match_data');
      setMatchEndData(data);
      setShowMatchEndPopup(true);
    };
    
    const handleRoundEnd = () => {
      sessionStorage.removeItem('round1_match_data');
      showInfoToast('Round 1 has ended');
      setTimeout(() => router.push('/dashboard'), 3000);
    };
    
    socket.on('round1:timerUpdate', handleTimerUpdate);
    socket.on('round1:matchEnd', handleMatchEnd);
    socket.on('round1:ended', handleRoundEnd);
    socket.on('round1:matchResumed', handleMatchResumed);
    socket.on('round1:matchPaused', handleMatchPaused);
    
    return () => {
      socket.off('round1:timerUpdate', handleTimerUpdate);
      socket.off('round1:matchEnd', handleMatchEnd);
      socket.off('round1:ended', handleRoundEnd);
      socket.off('round1:matchResumed', handleMatchResumed);
      socket.off('round1:matchPaused', handleMatchPaused);
    };
  }, [socket, isConnected, router]);

  useEffect(() => {
    if (isAuthLoading || !isConnected || !socket) return;

    const storedDataRaw = sessionStorage.getItem('round1_match_data');
    if (storedDataRaw) {
        try {
            const data = JSON.parse(storedDataRaw);
            setMatchData(data);
            const elapsed = (Date.now() - data.startTime) / 1000;
            setTimeRemaining(Math.max(0, Math.floor(data.duration / 1000 - elapsed)));

            // Re-sync with the server on every load/refresh
            socket.emit('round1:getState', {}, (response: { success: boolean; participant?: { status: string } }) => {
              if (response.success && response.participant?.status === 'in-match') {
                console.log("Successfully re-synced with match room on server.");
              } else {
                showErrorToast("Could not re-sync with match. It may have ended.");
                router.push('/r1/waiting');
              }
            });
        } catch {
            showErrorToast("Invalid match data. Returning to waiting room.");
            router.push('/r1/waiting');
        }
    } else {
        showInfoToast("No active match data found. Checking server...");
        // Ask server for state if sessionStorage is empty
        socket.emit('round1:getState', {}, (response: { success: boolean; participant?: { status: string } }) => {
          if(response.success && response.participant?.status === 'in-match'){
            // This is a rare case, maybe user cleared session storage.
            // We don't have the match data to show, so we redirect.
            showErrorToast("You are in a match but local data is missing.");
            router.push('/r1/waiting');
          } else {
            router.push('/r1/waiting');
          }
        });
    }
    setPageIsLoading(false);
  }, [isAuthLoading, user, socket, isConnected, router]);

  const handleMatchEndClose = () => {
    setShowMatchEndPopup(false);
    showInfoToast('Returning to the waiting room for your next match...');
    router.push('/r1/waiting');
  };

  if (pageIsLoading || isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black/40 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <p>Loading Round 1 Match...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <CodePageComponent 
        matchData={matchData}
        timeRemaining={timeRemaining}
      />
      
      {showMatchEndPopup && matchEndData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 p-8 rounded-lg border-2 border-orange-500 text-center max-w-md">
            <h2 className={`text-3xl font-bold mb-4 ${
              matchEndData.type === 'win' ? 'text-green-400' : 
              matchEndData.type === 'lose' ? 'text-red-400' : 'text-yellow-400'
            }`}>
              {matchEndData.type === 'win' ? '🎉 Victory!' : 
               matchEndData.type === 'lose' ? '😔 Defeat' : '⏰ Time Up!'}
            </h2>
            <p className="text-white text-lg mb-6">
              {matchEndData.type === 'win' ? 'You won the duel! You will enter a cooldown before the next match.' :
               matchEndData.type === 'lose' ? 'You lost this duel. You will enter a cooldown before the next match.' :
               "Time's up! The match has ended."}
            </p>
            <button
              onClick={handleMatchEndClose}
              className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors"
            >
              Continue to Waiting Room
            </button>
          </div>
        </div>
      )}
    </>
  );
}
