"use client";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useSocket } from "@/contexts/SocketContext";
import { useAuth } from "@/contexts/AuthContext";
import Editor, { useMonaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { showSuccessToast, showErrorToast, showInfoToast } from '@/components/shared/CustomToast';
import CustomScrollbar from "@/components/shared/CustomScrollbar";
import { Lightbulb, Play } from "lucide-react";

// --- Interfaces ---
interface SessionData {
  type: 'match' | 'bounty';
  opponent?: { id: string; username: string; };
  question: {
    id: string; title: string; description: string; difficulty: string;
    constraints?: string[]; boilerplate?: { [key: string]: string };
    sampleTestCases?: TestCase[]; hints?: string[];
  };
  endTime: number;
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

interface CodeContext {
  round: string; questionId: string; language: string;
}

interface CodeStore {
  [contextKey: string]: string;
}

// --- API & Socket Response Interfaces ---
interface GetCodePageStateResponse {
    success: boolean;
    sessionData?: SessionData;
    message?: string;
}

interface MatchResultData {
    winnerId: string;
    loserId: string;
    reason: 'submission' | 'disconnect' | 'timeout';
    newRole: 'elite' | 'challenger';
}

interface BountyEndedData {
    reason: 'completed' | 'incorrect' | 'timeout';
    newRole: 'elite' | 'challenger';
}

interface SubmissionApiResponse {
    success: boolean;
    results?: SubmissionResult[];
    summary?: { passed: number; total: number };
    submission?: { status: string };
    message?: string;
}

interface EndPopupData {
  type: 'win' | 'lose' | 'timeout' | 'bounty-win' | 'bounty-fail' | 'bounty-timeout';
  newRole: 'elite' | 'challenger';
}


// --- Helper Functions ---
const formatTime = (ms: number) => {
    if (ms <= 0) return "00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
};

const formatTestCaseData = (data: unknown): string => {
    if (typeof data === 'string') return data;
    if (typeof data === 'object' && data !== null) return JSON.stringify(data, null, 2);
    return String(data);
};

export default function R2CodePage() {
  const router = useRouter();
  const { session } = useAuth();
  const { socket, isConnected } = useSocket();
  
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [pageIsLoading, setPageIsLoading] = useState(true);
  
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState(() => {
    try { return localStorage.getItem('battlecode-round-2-language') || "python"; } 
    catch { return "python"; }
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [submissionResults, setSubmissionResults] = useState<SubmissionResult[] | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [activeTab, setActiveTab] = useState<'testcases' | 'results'>('testcases');
  const [codeEditorHeight, setCodeEditorHeight] = useState(60);
  const [isDragging, setIsDragging] = useState(false);

  const [showEndPopup, setShowEndPopup] = useState(false);
  const [endPopupData, setEndPopupData] = useState<EndPopupData | null>(null);

  const [currentContext, setCurrentContext] = useState<CodeContext | null>(null);
  
  const codeRef = useRef(code);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  
  function handleEditorMount(
      editor: monaco.editor.IStandaloneCodeEditor,
      monacoInstance: typeof import('monaco-editor')
    ){
      editorRef.current = editor;
      // Disable paste via context menu
      editor.addAction({
        id: "disable-paste",
        label: "Paste",
        keybindings: [],
        precondition: "false",
        run: () => {}
      });
      // Block DOM paste events
      const domNode = editor.getDomNode();
      if (domNode) {
        domNode.addEventListener("paste", (e: any) => {
          e.preventDefault();
          showErrorToast("Paste is disabled");
        }, true);
      }
      // Block keyboard shortcut Ctrl/Cmd+V
      editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyV, () => {
        showErrorToast("Paste shortcut is disabled");
      });
    }
    
  
  useEffect(() => { codeRef.current = code; }, [code]);
  useEffect(() => { 
    try { localStorage.setItem('battlecode-round-2-language', language); } catch (e) { console.error("Could not save language to localStorage.", e); }
  }, [language]);

  const contextManager = useMemo(() => ({
    getStorageKey: () => `battlecode-round-2-code-store`,
    generateContextKey: (qId: string, lang: string) => `2:${qId}:${lang}`,
    loadCodeStore: (): CodeStore => {
      try { const stored = localStorage.getItem(contextManager.getStorageKey()); return stored ? JSON.parse(stored) : {}; } 
      catch { return {}; }
    },
    saveCodeStore: (store: CodeStore) => {
      try { localStorage.setItem(contextManager.getStorageKey(), JSON.stringify(store)); return true; } 
      catch { return false; }
    },
    getBoilerplate: (p: SessionData['question'] | null, lang: string) => p?.boilerplate?.[lang] || '',
    createContext: (qId: string, lang: string): CodeContext => ({ round: '2', questionId: qId, language: lang }),
    getCodeForContext: (store: CodeStore, context: CodeContext) => store[contextManager.generateContextKey(context.questionId, context.language)] || '',
    setCodeForContext: (store: CodeStore, context: CodeContext, newCode: string) => {
      const key = contextManager.generateContextKey(context.questionId, context.language);
      return { ...store, [key]: newCode };
    }
  }), []);
  
  const scheduleAutoSave = useCallback(() => {
    if (!currentContext || !codeRef.current) return;
    const codeToSave = codeRef.current;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
        const currentStore = contextManager.loadCodeStore();
        const updatedStore = contextManager.setCodeForContext(currentStore, currentContext, codeToSave);
        contextManager.saveCodeStore(updatedStore);
    }, 1000);
  }, [currentContext, contextManager]);
  
  useEffect(() => {
    if (code && currentContext) {
        scheduleAutoSave();
    }
  }, [code, currentContext, scheduleAutoSave]);

  useEffect(() => {
    if (!sessionData?.question) return;
    
    const loadedStore = contextManager.loadCodeStore();
    const newContext = contextManager.createContext(sessionData.question.id, language);
    setCurrentContext(newContext);

    const savedCode = contextManager.getCodeForContext(loadedStore, newContext);
    const boilerplate = contextManager.getBoilerplate(sessionData.question, language);
    setCode(savedCode || boilerplate);

  }, [sessionData, language, contextManager]);
  
  const executeCode = useCallback(async (isFinalSubmission: boolean) => {
    if (!sessionData || (isSubmitting || isRunning)) return;
    const action = isFinalSubmission ? 'Submitting' : 'Running';
    const actionVerb = isFinalSubmission ? 'submit' : 'run';

    if (isFinalSubmission) setIsSubmitting(true); else setIsRunning(true);

    setSubmissionResults(null);
    setActiveTab('results');
    showInfoToast(`${action} for judging...`);

    const endpoint = `/api/submit/${actionVerb}`;
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ 
            language, 
            source_code: code, 
            problemId: sessionData.question.id, 
            roundNumber: 2,
            context: {
                type: sessionData.type,
                contextId: sessionStorage.getItem('r2_context_id')
            }
        })
      });
      const result: SubmissionApiResponse = await response.json();
      if (result.success) {
        setSubmissionResults(result.results || []);
        const summary = result.summary || { passed: 0, total: (result.results || []).length };
        
        if (isFinalSubmission) {
          if (result.submission?.status !== 'ACCEPTED') {
              showErrorToast(`${summary.passed}/${summary.total} test cases passed.`);
          } else {
              showSuccessToast('All test cases passed!');
          }
        } else {
            showInfoToast(`Test run completed: ${summary.passed}/${summary.total} passed`);
        }
      } else { throw new Error(result.message || 'Request failed'); }
    } catch (error) {
      showErrorToast(`Failed to ${actionVerb}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (isFinalSubmission) setIsSubmitting(false); else setIsRunning(false);
    }
  }, [sessionData, isSubmitting, isRunning, session?.access_token, language, code]);

  const monaco = useMonaco();
  const getMonacoLanguage = (lang: string) => {
    const languageMap: { [key: string]: string } = {
      'python': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      
    };
    return languageMap[lang] || 'python';
  };
  useEffect(() => {
    monaco?.editor.defineTheme('custom-dark', {
      base: 'vs-dark', inherit: true, rules: [],
      colors: { 'editor.background': '#0a0a0a', 'editor.foreground': '#ffffff', 'editor.lineHighlightBackground': '#1a1a1a', 'editor.selectionBackground': '#264f78', 'editorCursor.foreground': '#f97316', 'editorLineNumber.foreground': '#858585', 'editorLineNumber.activeForeground': '#f97316' },
    });
    monaco?.editor.setTheme('custom-dark');
  }, [monaco]);
  const editorOptions = { minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false, automaticLayout: true, wordWrap: 'on' as const };

  const handleMouseDown = (e: React.MouseEvent) => { setIsDragging(true); e.preventDefault(); };
  const handleMouseUp = useCallback(() => setIsDragging(false), []);
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const container = document.querySelector('.code-results-container') as HTMLElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const newHeight = Math.max(20, Math.min(80, ((e.clientY - rect.top) / rect.height) * 100));
    setCodeEditorHeight(newHeight);
  }, [isDragging]);

    useEffect(() => {
    if (monaco && editorRef.current) {
      let internalClipboard = "";
      const editor = editorRef.current;

      // intercept copy
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, () => {
        const sel = editor.getSelection();
        if (sel) {
          const selection = editor.getModel()?.getValueInRange(sel);
          if (selection) {
            internalClipboard = selection;
          }
        }
      });

      // intercept cut
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX, () => {
        const sel = editor.getSelection();
        if (sel) {
          const selection = editor.getModel()?.getValueInRange(sel);
          if (selection) {
            internalClipboard = selection;
            editor.executeEdits("cut", [
              { range: sel, text: "", forceMoveMarkers: true },
            ]);
          }
        }
      });

      // intercept paste
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
        const sel = editor.getSelection();
        if (internalClipboard && sel) {
          editor.executeEdits("paste", [
            { range: sel, text: internalClipboard, forceMoveMarkers: true },
          ]);
        }
      });

      // disable right-click menu
      editor.updateOptions({ contextmenu: false });
    }
  }, [monaco]);

  

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
  }, [isDragging, handleMouseMove, handleMouseUp]);
  
  // --- FIX: Wrapped triggerSessionEnd in useCallback ---
  const triggerSessionEnd = useCallback((type: EndPopupData['type'], newRole: 'elite' | 'challenger') => {
    if (!newRole) {
        console.error("TriggerSessionEnd called without a new role. Aborting popup.");
        showErrorToast("Could not determine next step. Redirecting to dashboard.");
        router.push('/dashboard');
        return;
    }
    sessionStorage.removeItem('r2_session_type');
    sessionStorage.removeItem('r2_context_id');
    sessionStorage.setItem('r2_user_role', newRole);
    setEndPopupData({ type, newRole });
    setShowEndPopup(true);
  }, [router]);

  useEffect(() => {
    if (!sessionData?.endTime || showEndPopup) return;

    const timerInterval = setInterval(() => {
        const remaining = sessionData.endTime - Date.now();
        if (remaining <= 0) {
            setTimeRemaining(0);
            clearInterval(timerInterval);
            if (!showEndPopup) {
                const userRole = (sessionStorage.getItem('r2_user_role') as 'elite' | 'challenger') || 'challenger';
                const type = sessionData.type === 'bounty' ? 'bounty-timeout' : 'timeout';
                triggerSessionEnd(type, userRole);
            }
        } else {
            setTimeRemaining(remaining);
        }
    }, 1000);

    return () => clearInterval(timerInterval);
  // --- FIX: Added triggerSessionEnd to dependency array ---
  }, [sessionData, showEndPopup, triggerSessionEnd]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const sessionType = sessionStorage.getItem('r2_session_type');
    const contextId = sessionStorage.getItem('r2_context_id');
    const userRole = sessionStorage.getItem('r2_user_role') || '';

    if (!sessionType || !contextId) {
        showErrorToast("Session context is missing. Returning.");
        router.push(userRole ? `/r2/${userRole}`: '/dashboard');
        return;
    }

    socket.emit('round2:getCodePageState', { contextId, sessionType }, (response: GetCodePageStateResponse) => {
        if (response.success && response.sessionData) {
            setSessionData(response.sessionData);
        } else {
            showErrorToast(response.message || "Could not load session data.");
            router.push(`/r2/${userRole}`);
        }
        setPageIsLoading(false);
    });
  }, [socket, isConnected, router]);
  
  useEffect(() => {
    if (!socket || !session?.user?.email) return;

    const handleMatchResult = (data: MatchResultData) => {
        const isWinner = data.winnerId === session.user.email;
        const type = data.reason === 'timeout' ? 'timeout' : (isWinner ? 'win' : 'lose');
        triggerSessionEnd(type, data.newRole);
    };

    const handleBountyEnded = (data: BountyEndedData) => {
        const type = data.reason === 'completed' ? 'bounty-win' : 'bounty-fail';
        triggerSessionEnd(type, data.newRole);
    };

    const handleRoundEnd = () => {
        showInfoToast("Round 2 has ended. You will be redirected to the dashboard.");
        sessionStorage.removeItem('r2_session_type');
        sessionStorage.removeItem('r2_context_id');
        setTimeout(() => {
            router.push('/dashboard');
        }, 3000);
    };

    socket.on('round2:matchResult', handleMatchResult);
    socket.on('round2:bountyEnded', handleBountyEnded);
    socket.on('round2:ended', handleRoundEnd);

    return () => {
        socket.off('round2:matchResult', handleMatchResult);
        socket.off('round2:bountyEnded', handleBountyEnded);
        socket.off('round2:ended', handleRoundEnd);
    };
  // --- FIX: Added triggerSessionEnd to dependency array ---
  }, [socket, router, session?.user?.email, triggerSessionEnd]);

  useEffect(() => {
    if (showEndPopup && endPopupData?.newRole) {
      const timer = setTimeout(() => {
        router.push(`/r2/${endPopupData.newRole}`);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showEndPopup, endPopupData, router]);


  if (pageIsLoading || !sessionData) {
    return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading Session...</div>;
  }

  const { question, type, opponent } = sessionData;

  const getPopupContent = (data: EndPopupData | null) => {
    if (!data) return null;
    switch (data.type) {
        case 'win': return { title: '🎉 Victory!', message: `You defeated your opponent! Your new role is ${data.newRole}.`, className: 'text-green-400' };
        case 'lose': return { title: '😔 Defeat', message: `You were defeated. Your new role is ${data.newRole}.`, className: 'text-red-400' };
        case 'timeout': return { title: "⏰ Time's Up!", message: 'The match ended. You will now be redirected.', className: 'text-yellow-400' };
        case 'bounty-win': return { title: '🏆 Bounty Claimed!', message: `You solved the bounty! Your new role is ${data.newRole}.`, className: 'text-green-400' };
        case 'bounty-fail': return { title: '💡 Attempt Logged', message: 'Your solution was incorrect. You will be redirected.', className: 'text-yellow-400' };
        case 'bounty-timeout': return { title: "⏳ Time's Up!", message: 'Your bounty attempt timed out. You will be redirected.', className: 'text-yellow-400' };
        default: return null;
    }
  };

  const popupContent = getPopupContent(endPopupData);


  return (
    <>
    <div className="flex flex-col h-screen text-white overflow-hidden bg-[url('/bg-code.svg')] bg-fixed bg-cover bg-center oxanium">
        <div className="flex-1 flex p-4 gap-4 bg-black/40 min-h-0">
          <CustomScrollbar className="w-1/2 flex border rounded-lg border-amber-600 bg-black/40 p-4 flex-col min-h-0 overflow-hidden glass-box">
              <div className="flex justify-between items-start mb-4 flex-shrink-0">
                  <div>
                      <h2 className="text-2xl font-bold">{question.title}</h2>
                      <div className="flex gap-4 text-sm text-gray-400 mt-1">
                          {/* <span>Difficulty: {question.difficulty}</span> */}
                          {type === 'match' && opponent && <span>vs {opponent.username}</span>}
                          {type === 'bounty' && <span>Bounty Challenge</span>}
                      </div>
                  </div>
                  {question.hints && question.hints.length > 0 && (
                    <button onClick={() => setShowHints(!showHints)} className="rounded-lg border p-4 h-12 text-white border-amber-600 font-oxanium w-30 justify-center items-center flex bg-black/20 backdrop-blur-sm hover:bg-amber-600 hover:text-black transition-colors duration-300 gap-2">
                      <Lightbulb className="h-4 w-4" /> {showHints ? "Hide" : "Hint"}
                    </button>
                  )}
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 pr-2">
                {showHints && question.hints && question.hints.length > 0 && (
                  <div className="mb-4 bg-black p-3 rounded"><h3 className="font-bold mb-2 text-amber-400">Hints:</h3><ul className="list-disc list-inside text-gray-300 space-y-2">{question.hints.map((hint, i) => <li key={i}>{hint}</li>)}</ul></div>
                )}
                <p className="mb-4 text-gray-300 whitespace-pre-wrap">{question.description}</p>
                {question.constraints && question.constraints.length > 0 && (
                  <><h3 className="font-bold mb-2 text-amber-400">Constraints:</h3><ul className="list-disc list-inside mb-4 text-gray-300 font-mono text-sm">{question.constraints.map((c, i) => <li key={i}>{c}</li>)}</ul></>
                )}
                {question.sampleTestCases && question.sampleTestCases.length > 0 && (
                  <><h3 className="font-bold mb-4 text-amber-400">Sample Cases:</h3>
                  {question.sampleTestCases.map((tc, i) => (
                      <div key={i} className="mb-4 bg-black/20 border-amber-600/50 mr-2 border-2 p-3 rounded font-mono text-sm">
                        <p className="font-bold text-gray-400">Input:</p><pre className="bg-gray-800/60 p-2 rounded mt-1 whitespace-pre-wrap">{formatTestCaseData(tc.stdin || tc.input?.stdin || tc.input?.json || '')}</pre>
                        <p className="mt-2 font-bold text-gray-400">Output:</p><pre className="bg-gray-800/60 p-2 rounded mt-1 whitespace-pre-wrap">{formatTestCaseData(tc.expected_output || tc.output?.stdout || tc.output?.json || '')}</pre>
                        {tc.explanation && <p className="mt-2 text-xs text-gray-400 italic">Explanation: {tc.explanation}</p>}
                      </div>
                  ))}</>
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
                      <div className={`text-center p-2 font-mono text-xl bg-gray-800 rounded border border-amber-600 ${timeRemaining <= 60000 ? 'text-red-400 animate-pulse' : ''}`}>
                          {formatTime(timeRemaining)}
                      </div>
                      <div className="flex-1 flex justify-end items-center gap-2">
                          <button onClick={() => executeCode(false)} disabled={isRunning || isSubmitting} className="flex items-center bg-black text-white p-2 rounded border border-amber-600 hover:bg-amber-600 hover:text-black transition-colors disabled:opacity-50"><span className="pl-2">Run</span><Play className="ml-2 h-4 w-4"/></button>
                          <button onClick={() => executeCode(true)} disabled={isSubmitting || isRunning} className="flex items-center gap-2 bg-black text-white p-2 rounded border border-amber-600 hover:bg-amber-600 hover:text-black transition-colors disabled:opacity-50"><p className="pl-2">{isSubmitting ? "Submitting..." : "Submit"}</p><Image src="/submit_2.png" alt="submit" width={16} height={16} className="mr-2"/></button>
                      </div>
                  </div>
                  <div className="flex-1 rounded overflow-hidden border border-gray-700">
                      <Editor
  height="100%"
  language={getMonacoLanguage(language)}
  value={code}
  onChange={(value) => setCode(value || "")}
  theme="custom-dark"
  options={editorOptions}
  onMount={handleEditorMount}
  loading={
    <div className="flex items-center justify-center h-full bg-black">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
    </div>
  }
/>
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
                                  {question.sampleTestCases?.length ? question.sampleTestCases.map((tc, i) => (
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
                                  {(isRunning || isSubmitting) && !submissionResults && <div className="flex items-center justify-center h-full"><div className="flex items-center gap-2 text-amber-400"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-500"></div><span>Processing...</span></div></div>}
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
    {showEndPopup && popupContent && (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-lg border-2 border-orange-500 text-center max-w-md">
          <h2 className={`text-3xl font-bold mb-4 ${popupContent.className}`}>
            {popupContent.title}
          </h2>
          <p className="text-white text-lg mb-6">
            {popupContent.message}
          </p>
          <p className="text-sm text-gray-400">
            Redirecting in 5 seconds...
          </p>
        </div>
      </div>
    )}
    </>
  );
}