"use client";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useSocket } from "@/contexts/SocketContext";
import { useAuth } from "@/contexts/AuthContext";
import Editor, { useMonaco } from '@monaco-editor/react';
import { showSuccessToast, showErrorToast, showInfoToast } from '@/components/shared/CustomToast';
import CustomScrollbar from "@/components/shared/CustomScrollbar";
import { Save, CheckCircle, AlertTriangle, Lightbulb, RotateCcw, Play } from "lucide-react";

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

interface GetStateResponse {
  success: boolean;
  participant?: {
    status: string;
  };
  error?: string;
}


// ============================================================================
// UI Component
// ============================================================================
function CodePageComponent({ matchData, timeRemaining }: CodePageProps) {
  const { session } = useAuth();
  
  const [problem, setProblem] = useState<MatchData['question'] | null>(null);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState(() => {
    try { return localStorage.getItem('battlecode-round-1-language') || "python"; } 
    catch { return "python"; }
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [submissionResults, setSubmissionResults] = useState<SubmissionResult[] | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [activeTab, setActiveTab] = useState<'testcases' | 'results'>('testcases');
  const [codeEditorHeight, setCodeEditorHeight] = useState(60);
  const [isDragging, setIsDragging] = useState(false);

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
      try { const stored = localStorage.getItem(contextManager.getStorageKey(round)); return stored ? JSON.parse(stored) : {}; } 
      catch { return {}; }
    },
    saveCodeStore: (round: string, store: CodeStore) => {
      try { localStorage.setItem(contextManager.getStorageKey(round), JSON.stringify(store)); return true; } 
      catch { return false; }
    },
    getBoilerplate: (p: MatchData['question'] | null, lang: string) => p?.boilerplate?.[lang] || '',
    createContext: (round: string, qId: string, lang: string) => ({ round, questionId: qId, language: lang }),
    contextEquals: (a: CodeContext | null, b: CodeContext | null) => a && b && a.round === b.round && a.questionId === b.questionId && a.language === b.language,
    getCodeForContext: (store: CodeStore, context: CodeContext) => store[contextManager.generateContextKey(context.round, context.questionId, context.language)] || '',
    setCodeForContext: (store: CodeStore, context: CodeContext, newCode: string) => {
      const key = contextManager.generateContextKey(context.round, context.questionId, context.language);
      return { ...store, [key]: newCode };
    },
    removeCodeForContext: (store: CodeStore, context: CodeContext): CodeStore => {
      const key = contextManager.generateContextKey(context.round, context.questionId, context.language);
      const newStore = { ...store };
      delete newStore[key];
      return newStore;
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
    if (isContextInitialized && code && currentContext) {
        scheduleAutoSave();
    }
  }, [code, isContextInitialized, currentContext, scheduleAutoSave]);

  const handleContextTransition = useCallback((newProblem: MatchData['question'], newLanguage: string) => {
    const newContext = contextManager.createContext('1', newProblem.id, newLanguage);
    if (!currentContext || contextManager.contextEquals(currentContext, newContext)) return;

    let updatedStore = { ...codeStore };
    
    const currentCode = codeRef.current;
    const boilerplate = contextManager.getBoilerplate(problem, currentContext.language);
    if (currentCode && currentCode !== boilerplate) {
      updatedStore = contextManager.setCodeForContext(updatedStore, currentContext, currentCode);
      contextManager.saveCodeStore('1', updatedStore);
    }

    const savedCode = contextManager.getCodeForContext(updatedStore, newContext);
    const newBoilerplate = contextManager.getBoilerplate(newProblem, newLanguage);
    
    setCodeStore(updatedStore);
    setCode(savedCode || newBoilerplate);
    setCurrentContext(newContext);
    setSubmissionResults(null);
    setActiveTab('testcases');
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

  const executeCode = useCallback(async (isFinalSubmission: boolean) => {
    if (!problem || !matchData || (isSubmitting || isRunning)) return;
    const action = isFinalSubmission ? 'Submitting' : 'Running';

    if (isFinalSubmission) setIsSubmitting(true); else setIsRunning(true);

    setSubmissionResults(null);
    setActiveTab('results');
    showInfoToast(`${action} for judging...`);

    const endpoint = isFinalSubmission ? '/submit' : '/run';
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/submit${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ language, source_code: code, problemId: problem.id, roundNumber: 1 })
      });
      const result = await response.json();
      if (result.success) {
        setSubmissionResults(result.results || []);
        const summary = result.summary || { passed: 0, total: (result.results || []).length };
        if (isFinalSubmission) {
            if (result.submission?.status === 'ACCEPTED') {
                showSuccessToast(`🎉 All ${summary.total} test cases passed!`);
            } else {
                showErrorToast(`${summary.passed}/${summary.total} test cases passed.`);
            }
        } else {
            showInfoToast(`Test run completed: ${summary.passed}/${summary.total} passed`);
        }
      } else { throw new Error(result.message || 'Request failed'); }
    } catch (error) {
      showErrorToast(`Failed to ${action.toLowerCase()}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (isFinalSubmission) setIsSubmitting(false); else setIsRunning(false);
    }
  }, [problem, matchData, isSubmitting, isRunning, session?.access_token, language, code]);

  const monaco = useMonaco();
  useEffect(() => {
    if (monaco) {
      monaco.editor.defineTheme('custom-dark', {
        base: 'vs-dark', inherit: true,
        rules: [],
        colors: {
          'editor.background': '#0a0a0a', 'editor.foreground': '#ffffff',
          'editor.lineHighlightBackground': '#1a1a1a', 'editor.selectionBackground': '#264f78',
          'editorCursor.foreground': '#f97316', 'editorLineNumber.foreground': '#858585',
          'editorLineNumber.activeForeground': '#f97316',
        },
      });
      monaco.editor.setTheme('custom-dark');
    }
  }, [monaco]);
  const editorOptions = {
    minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false,
    automaticLayout: true, wordWrap: 'on' as const,
  };

  const handleMouseDown = (e: React.MouseEvent) => { setIsDragging(true); e.preventDefault(); };
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const container = document.querySelector('.code-results-container') as HTMLElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const newHeight = Math.max(20, Math.min(80, ((e.clientY - rect.top) / rect.height) * 100));
    setCodeEditorHeight(newHeight);
  }, [isDragging]);

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
    };
  }, [isDragging, handleMouseMove]);
  
  const resetCodeToBoilerplate = () => {
    if (!problem || !currentContext) return;
    const boilerplate = contextManager.getBoilerplate(problem, language);
    setCode(boilerplate);
    setCodeStore(prev => {
      const updated = contextManager.removeCodeForContext(prev, currentContext);
      contextManager.saveCodeStore('1', updated);
      return updated;
    });
    showInfoToast('Code has been reset to boilerplate');
  };
  
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
    className: timeRemaining <= 60 ? 'text-red-400' : timeRemaining <= 300 ? 'text-yellow-400' : ''
  });

  const formatTestCaseData = (data: unknown): string => {
    if (typeof data === 'string') return data;
    if (typeof data === 'object' && data !== null) return JSON.stringify(data, null, 2);
    return String(data);
  };

  if (!problem || !matchData) return <div className="text-white text-center p-8">Initializing editor...</div>;

  const saveStatusDisplay = getSaveStatusDisplay();
  const timerDisplay = getTimerDisplay();

  return (
    <div className="flex flex-col h-screen text-white overflow-hidden bg-[url('/bg-code.svg')] bg-fixed bg-cover bg-center oxanium">
        <div className="flex-1 flex p-4 gap-4 bg-black/40 min-h-0">
          <CustomScrollbar className="w-1/2 flex border rounded-lg border-amber-600 bg-black/40 p-4 flex-col min-h-0 overflow-hidden glass-box">
              <div className="flex justify-between items-start mb-4 flex-shrink-0">
                  <div>
                      <h2 className="text-2xl font-bold">{problem.title}</h2>
                      <div className="flex gap-4 text-sm text-gray-400 mt-1">
                          <span>Difficulty: {problem.difficulty}</span>
                          <span>vs {matchData.opponent.id}</span>
                      </div>
                  </div>
                  {problem.hints && problem.hints.length > 0 && (
                    <button onClick={() => setShowHints(!showHints)} className="rounded-lg border p-4 h-12 text-white border-amber-600 font-oxanium w-30 justify-center items-center flex bg-black/20 backdrop-blur-sm hover:bg-amber-600 hover:text-black transition-colors duration-300 gap-2">
                      <Lightbulb className="h-4 w-4" /> {showHints ? "Hide" : "Hint"}
                    </button>
                  )}
              </div>
              
              <div className="flex-1 overflow-y-auto min-h-0">
                {showHints && problem.hints && problem.hints.length > 0 && (
                  <div className="mb-4 bg-black p-3 rounded">
                    <h3 className="font-bold mb-2 text-amber-400">Hints:</h3>
                    <ul className="list-disc list-inside text-gray-300 space-y-2">
                      {problem.hints.map((hint, i) => <li key={i}>{hint}</li>)}
                    </ul>
                  </div>
                )}

                <p className="mb-4 text-gray-300 whitespace-pre-wrap">{problem.description}</p>

                {problem.constraints && problem.constraints.length > 0 && (
                  <>
                    <h3 className="font-bold mb-2 text-amber-400">Constraints:</h3>
                    <ul className="list-disc list-inside mb-4 text-gray-300 font-mono text-sm">
                      {problem.constraints.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </>
                )}

                {problem.sampleTestCases && problem.sampleTestCases.length > 0 && (
                  <>
                    <h3 className="font-bold mb-4 text-amber-400">Sample Cases:</h3>
                    {problem.sampleTestCases.map((tc, i) => (
                      <div key={i} className="mb-4 bg-black/20 border-amber-600/50 mr-2 border-2 p-3 rounded font-mono text-sm">
                        <p className="font-bold text-gray-400">Input:</p>
                        <pre className="bg-gray-800/60 p-2 rounded mt-1 whitespace-pre-wrap">{formatTestCaseData(tc.stdin || tc.input?.stdin || tc.input?.json || '')}</pre>
                        <p className="mt-2 font-bold text-gray-400">Output:</p>
                        <pre className="bg-gray-800/60 p-2 rounded mt-1 whitespace-pre-wrap">{formatTestCaseData(tc.expected_output || tc.output?.stdout || tc.output?.json || '')}</pre>
                        {tc.explanation && <p className="mt-2 text-xs text-gray-400 italic">Explanation: {tc.explanation}</p>}
                      </div>
                    ))}
                  </>
                )}
              </div>
          </CustomScrollbar>
          <div className="w-1/2 flex flex-col code-results-container gap-1">
              <div className="border border-amber-600 rounded-lg p-4 flex flex-col min-h-0 glass-box" style={{ height: `${codeEditorHeight}%`}}>
                  <div className="flex justify-between items-center mb-2 gap-2">
                      <select value={language} onChange={(e) => setLanguage(e.target.value)} className="bg-black text-white p-2 rounded border w-32 border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500">
                          <option value="python">Python</option><option value="java">Java</option>
                          <option value="cpp">C++</option><option value="javascript">JavaScript</option>
                      </select>
                      <div className={`text-center p-2 font-mono text-xl bg-gray-800 rounded border border-amber-600 ${timerDisplay.className}`}>
                          {timerDisplay.time}
                      </div>
                      <div className="flex-1 flex justify-end items-center gap-2">
                          {saveStatusDisplay.text && (<span className={`text-xs ${saveStatusDisplay.className} flex items-center gap-1`}>{saveStatusDisplay.icon}{saveStatusDisplay.text}</span>)}
                          <button onClick={() => executeCode(false)} disabled={isRunning || isSubmitting} className="flex items-center bg-black text-white p-2 rounded border border-amber-600 hover:bg-amber-600 hover:text-black transition-colors disabled:opacity-50"><span className="pl-2">Run</span><Play className="ml-2 h-4 w-4"/></button>
                          <button onClick={() => executeCode(true)} disabled={isSubmitting || isRunning} className="flex items-center gap-2 bg-black text-white p-2 rounded border border-amber-600 hover:bg-amber-600 hover:text-black transition-colors disabled:opacity-50"><p className="pl-2">{isSubmitting ? "Submitting..." : "Submit"}</p><Image src="/submit_2.png" alt="submit" width={16} height={16} className="mr-2"/></button>
                          <button onClick={resetCodeToBoilerplate} title="Reset to boilerplate" className="flex items-center gap-2 bg-black text-white p-2 rounded border border-amber-600 hover:bg-amber-600 hover:text-black transition-colors"><RotateCcw className="h-4 w-4"/></button>
                      </div>
                  </div>
                  <div className="flex-1 rounded overflow-hidden border border-gray-700">
                      <Editor height="100%" language={language} value={code} onChange={(v) => setCode(v || "")} theme="custom-dark" options={editorOptions} />
                  </div>
              </div>

              <div onMouseDown={handleMouseDown} className={`h-1 bg-amber-600/20 hover:bg-amber-600/40 cursor-row-resize transition-colors flex items-center justify-center ${isDragging ? 'bg-amber-600/60' : ''}`}><div className="w-8 h-1 bg-amber-600 rounded-full"></div></div>
              <div className="border border-amber-600 rounded-lg p-4 flex flex-col glass-box" style={{ height: `${100 - codeEditorHeight}%` }}>
                  <div className="flex border-b border-amber-600/30 mb-3 flex-shrink-0">
                      <button onClick={() => setActiveTab('testcases')} className={`px-4 py-2 font-medium ${activeTab === 'testcases' ? 'border-b-2 border-amber-500 text-amber-400' : 'text-gray-400'}`}>Test Cases</button>
                      <button onClick={() => setActiveTab('results')} className={`px-4 py-2 font-medium ${activeTab === 'results' ? 'border-b-2 border-amber-500 text-amber-400' : 'text-gray-400'}`}>Test Results {submissionResults && <span className="ml-2 text-xs bg-amber-600 text-black px-2 py-1 rounded-full">{submissionResults.length}</span>}</button>
                  </div>
                  <div className="flex-1 min-h-0">
                      <CustomScrollbar className="h-full overflow-y-auto">
                          {activeTab === 'testcases' && (
                              <div className="space-y-3 pr-2">
                                  {problem.sampleTestCases?.length ? problem.sampleTestCases.map((tc, i) => (
                                      <div key={i} className="border border-gray-600 rounded-lg p-3 bg-black/20">
                                          <h4 className="font-semibold text-amber-400">Case {i + 1}</h4>
                                          <div className="space-y-2 mt-2">
                                              <div><p className="text-sm font-medium text-gray-300 mb-1">Input:</p><pre className="bg-gray-800/60 p-2 rounded text-sm font-mono overflow-x-auto border border-gray-700">{formatTestCaseData(tc.stdin || tc.input?.stdin || tc.input?.json || '')}</pre></div>
                                              <div><p className="text-sm font-medium text-gray-300 mb-1">Expected Output:</p><pre className="bg-gray-800/60 p-2 rounded text-sm font-mono overflow-x-auto border border-gray-700">{formatTestCaseData(tc.expected_output || tc.output?.stdout || tc.output?.json || '')}</pre></div>
                                          </div>
                                      </div>
                                  )) : <div className="text-center text-gray-400 py-8"><p>No sample test cases.</p></div>}
                              </div>
                          )}
                          {activeTab === 'results' && (
                              <div className="pr-2">
                                  {(isRunning || isSubmitting) && <div className="flex items-center gap-2 text-amber-400"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-500"></div><span>Processing...</span></div>}
                                  {submissionResults?.length ? (
                                      <div className="space-y-2">
                                          {submissionResults.map((res, i) => {
                                              const isAccepted = res.status.description === "Accepted";
                                              return (
                                                  <div key={res.token || i} className={`p-3 rounded border ${isAccepted ? "bg-green-800/30 border-green-600/50" : "bg-red-800/30 border-red-600/50"}`}>
                                                      <div className="flex items-center justify-between mb-2"><p className="font-bold">Test Case {i + 1}</p><span className={`text-sm font-medium px-2 py-1 rounded ${isAccepted ? "text-green-400 bg-green-900/50" : "text-red-400 bg-red-900/50"}`}>{res.status.description}</span></div>
                                                      {!isAccepted && (res.stderr || res.compile_output) && <pre className="text-xs text-red-300 whitespace-pre-wrap bg-black/50 p-2 rounded border border-gray-700 overflow-x-auto">{res.stderr || res.compile_output}</pre>}
                                                      {res.time && <div className="flex gap-4 text-xs text-gray-400 mt-2"><span>Runtime: {res.time}s</span><span>Memory: {res.memory}KB</span></div>}
                                                  </div>
                                              );
                                          })}
                                      </div>
                                  ) : !isRunning && !isSubmitting && (<div className="text-center text-gray-400 py-8"><p>Run or submit code to see results</p></div>)}
                              </div>
                          )}
                      </CustomScrollbar>
                  </div>
              </div>
          </div>
        </div>
    </div>
  );
}

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
            socket.emit('round1:getState', {}, (response: GetStateResponse) => {
              if (!response.success || response.participant?.status !== 'in-match') {
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
        socket.emit('round1:getState', {}, (response: any) => {
            if (response.success && response.participant?.status === 'in-match') {
                showErrorToast("You are in a match but local data is missing.");
            }
            router.push('/r1/waiting');
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
              matchEndData.type === 'win' ? 'text-green-400' : 'text-red-400'
            }`}>
              {matchEndData.type === 'win' ? '🎉 Victory!' : '😔 Defeat'}
            </h2>
            <p className="text-white text-lg mb-6">
              {matchEndData.type === 'win' ? 'You won the duel! You will enter a cooldown before the next match.' :
               'You lost this duel. You will enter a cooldown before the next match.'}
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

