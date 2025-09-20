"use client";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/shared/button";
import Editor, { useMonaco } from '@monaco-editor/react';
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

// --- Context Management Interfaces ---
interface CodeContext {
  round: string;
  questionId: string;
  language: string;
}

interface CodeStore {
  [contextKey: string]: string; // "round:questionId:language" -> code
}

// --- UI Component ---
export default function CodePageComponent({ matchData, timeRemaining }: CodePageProps) {
  const { session, isLoading: authLoading } = useAuth();
  const monaco = useMonaco();
  
  const [problem, setProblem] = useState<MatchData['question'] | null>(null);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState(() => {
    // Load saved language preference from localStorage
    try {
      const saved = localStorage.getItem('battlecode-round-1-language');
      return saved || "python";
    } catch (error) {
      console.error('Failed to load language preference:', error);
      return "python";
    }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [submissionResults, setSubmissionResults] = useState<SubmissionResult[] | null>(null);
  const [showHints, setShowHints] = useState(false);
  
  // Context & Storage State
  const [currentContext, setCurrentContext] = useState<CodeContext | null>(null);
  const [codeStore, setCodeStore] = useState<CodeStore>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isContextInitialized, setIsContextInitialized] = useState(false);
  
  // Stable refs for race-free operations
  const codeRef = useRef(code);
  const currentContextRef = useRef(currentContext);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const languageRef = useRef(language);
  
  // Update refs when state changes
  useEffect(() => { codeRef.current = code; }, [code]);
  useEffect(() => { currentContextRef.current = currentContext; }, [currentContext]);
  useEffect(() => { languageRef.current = language; }, [language]);

  // ============================================================================
  // LANGUAGE PERSISTENCE - Save language preference to localStorage
  // ============================================================================
  
  useEffect(() => {
    try {
      localStorage.setItem('battlecode-round-1-language', language);
      console.log('💾 Saved language preference:', language);
    } catch (error) {
      console.error('Failed to save language preference:', error);
    }
  }, [language]);

  // ============================================================================
  // CONTEXT MANAGEMENT SYSTEM - Ultra Robust
  // ============================================================================

  const contextManager = useMemo(() => ({
    // Generate storage key for localStorage
    getStorageKey: (round: string): string => `battlecode-round-${round}-code-store`,
    
    // Generate context key for current state
    generateContextKey: (round: string, questionId: string, language: string): string => 
      `${round}:${questionId}:${language}`,
    
    // Parse context key back to components
    parseContextKey: (contextKey: string): { round: string; questionId: string; language: string } | null => {
      const parts = contextKey.split(':');
      if (parts.length !== 3) return null;
      return { round: parts[0], questionId: parts[1], language: parts[2] };
    },
    
    // Load entire code store from localStorage
    loadCodeStore: (round: string): CodeStore => {
      try {
        const stored = localStorage.getItem(contextManager.getStorageKey(round));
        return stored ? JSON.parse(stored) : {};
      } catch (error) {
        console.error('Failed to load code store:', error);
        return {};
      }
    },
    
    // Save entire code store to localStorage
    saveCodeStore: (round: string, store: CodeStore): boolean => {
      try {
        localStorage.setItem(contextManager.getStorageKey(round), JSON.stringify(store));
        return true;
      } catch (error) {
        console.error('Failed to save code store:', error);
        return false;
      }
    },
    
    // Get boilerplate code for a problem and language
    getBoilerplate: (problem: MatchData['question'] | null, language: string): string => {
      if (!problem) return '';
      return problem.boilerplate?.[language] || '';
    },
    
    // Create a new context
    createContext: (round: string, questionId: string, language: string): CodeContext => ({
      round,
      questionId, 
      language
    }),
    
    // Check if contexts are equal
    contextEquals: (a: CodeContext | null, b: CodeContext | null): boolean => {
      if (!a || !b) return false;
      return a.round === b.round && a.questionId === b.questionId && a.language === b.language;
    },
    
    // Get code for a specific context
    getCodeForContext: (store: CodeStore, context: CodeContext): string => {
      const key = contextManager.generateContextKey(context.round, context.questionId, context.language);
      return store[key] || '';
    },
    
    // Set code for a specific context
    setCodeForContext: (store: CodeStore, context: CodeContext, code: string): CodeStore => {
      const key = contextManager.generateContextKey(context.round, context.questionId, context.language);
      return { ...store, [key]: code };
    },
    
    // Remove code for a specific context
    removeCodeForContext: (store: CodeStore, context: CodeContext): CodeStore => {
      const key = contextManager.generateContextKey(context.round, context.questionId, context.language);
      const newStore = { ...store };
      delete newStore[key];
      return newStore;
    }
  }), []);
  
  // ============================================================================
  // INITIALIZATION - Load context and code store
  // ============================================================================
  
  useEffect(() => {
    if (!matchData?.question || isContextInitialized) return;
    
    console.log('🚀 Initializing context for Round 1:', matchData.question.title);
    
    // Load code store from localStorage
    const loadedStore = contextManager.loadCodeStore('1');
    setCodeStore(loadedStore);
    
    // Create initial context
    const initialContext = contextManager.createContext('1', matchData.question.id, language);
    setCurrentContext(initialContext);
    
    // Load code for initial context
    const savedCode = contextManager.getCodeForContext(loadedStore, initialContext);
    const boilerplate = contextManager.getBoilerplate(matchData.question, language);
    const codeToLoad = savedCode || boilerplate;
    
    console.log('📝 Loading code for context:', initialContext, 'Code length:', codeToLoad.length);
    setCode(codeToLoad);
    setProblem(matchData.question);
    
    setIsContextInitialized(true);
  }, [matchData, language, isContextInitialized, contextManager]);

  // ============================================================================
  // CONTEXT TRANSITION MANAGEMENT - The Heart of Robustness
  // ============================================================================
  
  const handleContextTransition = useCallback((newProblem: MatchData['question'] | null, newLanguage: string) => {
    if (!newProblem || !currentContext) return;
    
    const newContext = contextManager.createContext('1', newProblem.id, newLanguage);
    
    // If context hasn't actually changed, don't do anything
    if (contextManager.contextEquals(currentContext, newContext)) {
      console.log('🔄 Context unchanged, skipping transition');
      return;
    }
    
    console.log('🔄 Context transition:', currentContext, '->', newContext);
    
    // STEP 1: Save current code to current context
    const currentCode = codeRef.current;
    const currentBoilerplate = contextManager.getBoilerplate(
      problem, 
      currentContextRef.current?.language || language
    );
    
    if (currentCode && currentCode !== currentBoilerplate) {
      console.log('💾 Saving current code before transition');
      setCodeStore(prevStore => {
        const updatedStore = contextManager.setCodeForContext(prevStore, currentContext, currentCode);
        contextManager.saveCodeStore('1', updatedStore);
        return updatedStore;
      });
    }
    
    // STEP 2: Clear UI state for clean transition
    setSubmissionResults(null);
    
    // STEP 3: Load code for new context
    const savedCodeForNewContext = contextManager.getCodeForContext(codeStore, newContext);
    const newBoilerplate = contextManager.getBoilerplate(newProblem, newLanguage);
    const codeToLoad = savedCodeForNewContext || newBoilerplate;
    
    console.log('📝 Loading code for new context:', newContext, 'Code length:', codeToLoad.length);
    
    // STEP 4: Update state atomically
    setCurrentContext(newContext);
    setCode(codeToLoad);
    
  }, [currentContext, problem, language, codeStore, contextManager]);

  // ============================================================================
  // REACT TO PROP CHANGES - Language Changes
  // ============================================================================
  
  useEffect(() => {
    if (!isContextInitialized || !matchData?.question) return;
    handleContextTransition(matchData.question, language);
  }, [language, isContextInitialized, matchData, handleContextTransition]);

  // ============================================================================
  // AUTO-SAVE SYSTEM - Debounced and Robust
  // ============================================================================
  
  const scheduleAutoSave = useCallback(() => {
    if (!currentContext || !codeRef.current) return;
    
    const codeToSave = codeRef.current;
    const boilerplate = contextManager.getBoilerplate(problem, currentContext.language);
    
    // Don't save if code is same as boilerplate
    if (codeToSave === boilerplate) return;
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    setSaveStatus('saving');
    
    saveTimeoutRef.current = setTimeout(() => {
      console.log('💾 Auto-saving code for context:', currentContext);
      
      setCodeStore(prevStore => {
        const updatedStore = contextManager.setCodeForContext(prevStore, currentContext, codeToSave);
        const saveSuccess = contextManager.saveCodeStore('1', updatedStore);
        
        setSaveStatus(saveSuccess ? 'saved' : 'error');
        
        // Reset status after 2 seconds
        setTimeout(() => setSaveStatus('idle'), 2000);
        
        return updatedStore;
      });
      
      saveTimeoutRef.current = null;
    }, 600); // Quick debounce for responsive feel
    
  }, [currentContext, problem, contextManager]);

  // Trigger auto-save when code changes
  useEffect(() => {
    if (isContextInitialized && code && currentContext) {
      scheduleAutoSave();
    }
  }, [code, isContextInitialized, currentContext, scheduleAutoSave]);

  // ============================================================================
  // EMERGENCY SAVE - Before page unload
  // ============================================================================
  
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        const context = currentContextRef.current;
        const codeToSave = codeRef.current;
        
        if (context && codeToSave) {
          const boilerplate = contextManager.getBoilerplate(problem, context.language);
          if (codeToSave !== boilerplate) {
            console.log('🚨 Emergency save before page unload');
            const currentStore = contextManager.loadCodeStore('1');
            const updatedStore = contextManager.setCodeForContext(currentStore, context, codeToSave);
            contextManager.saveCodeStore('1', updatedStore);
          }
        }
      } catch (error) {
        console.error('Emergency save failed:', error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [problem, contextManager]);

  // Get save status display
  const getSaveStatusDisplay = () => {
    if (!currentContext) return { text: '', className: '', icon: null };
    
    switch (saveStatus) {
      case 'saving':
        return { text: 'Saving...', className: 'text-yellow-400', icon: <Save className="h-3 w-3" /> };
      case 'saved':
        return { text: 'Saved', className: 'text-green-400', icon: <CheckCircle className="h-3 w-3" /> };
      case 'error':
        return { text: 'Save Error', className: 'text-red-400', icon: <AlertTriangle className="h-3 w-3" /> };
      default:
        const savedCode = contextManager.getCodeForContext(codeStore, currentContext);
        return savedCode 
          ? { text: 'Saved', className: 'text-green-400', icon: <CheckCircle className="h-3 w-3" /> }
          : { text: '', className: '', icon: null };
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!problem || !matchData || isSubmitting) return;
    setIsSubmitting(true);
    setSubmissionResults(null);
    showInfoToast('Submitting your solution for final judging...');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ language, source_code: code, problemId: problem.id, roundNumber: 1 })
      });
      const result = await response.json();
      if (result.success) {
        setSubmissionResults(result.results || []);
        if (result.submission?.status === 'ACCEPTED') {
          showSuccessToast(`🎉 All test cases passed! You won the match!`);
        } else {
          showErrorToast(`${result.summary.passed}/${result.summary.total} test cases passed. Keep trying!`);
        }
      } else {
        throw new Error(result.message || 'Submission failed');
      }
    } catch (error) {
      showErrorToast(`Failed to submit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [problem, matchData, session, language, code, isSubmitting]);

  const executeCode = useCallback(async () => {
    if (!problem) return;
    setIsRunning(true);
    setSubmissionResults(null);
    showInfoToast('Running your code against sample cases...');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ language, source_code: code, problemId: problem.id })
      });
      const result = await response.json();
      if (result.success) {
        setSubmissionResults(result.results || []);
        showInfoToast(`Test run completed: ${result.summary.passed}/${result.summary.total} passed`);
      } else {
        throw new Error(result.error || 'Failed to run code');
      }
    } catch (error) {
      showErrorToast(`Failed to run code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  }, [problem, session, language, code]);
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerDisplay = (): { time: string; className: string } => {
    return {
      time: formatTime(timeRemaining),
      className: timeRemaining <= 60 ? 'border-red-600 text-red-400' : 
                 timeRemaining <= 300 ? 'border-yellow-600 text-yellow-400' : 'border-amber-600'
    };
  };

  if (authLoading || !problem || !matchData) {
    // A simple loading state, parent handles the main loading screen
    return <div className="text-white text-center p-8">Initializing editor...</div>;
  }

  return (
    <div className="flex flex-col h-screen text-white overflow-hidden bg-[url('/bg-code.svg')] bg-fixed bg-cover bg-center oxanium">
        {/* Debug Info - Remove in production */}
        {currentContext && (
          <div className="bg-gray-900 text-xs p-2 text-gray-400">
            Context: {currentContext.round}:{currentContext.questionId}:{currentContext.language} | 
            Code Length: {code.length} | 
            Store Keys: {Object.keys(codeStore).length}
          </div>
        )}
        
        <div className="flex-shrink-0 flex items-center justify-between p-4 bg-black/60 backdrop-blur-sm border-b border-amber-600">
            <div>
                <h1 className="text-xl font-bold text-amber-400">Round 1 - Coding Duel</h1>
                <div className="text-sm text-gray-300">
                    vs {matchData.opponent.id} | Difficulty: {matchData.difficulty || 'Medium'}
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
                  {/* ... other problem details ... */}
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
                        <button
                          className="rounded-lg border p-4 h-12 text-white border-amber-600 font-oxanium w-30 justify-center items-center flex bg-black/20 backdrop-blur-sm hover:bg-amber-600 hover:text-black transition-colors duration-300 shadow-[0_0_20px_rgba(220,38,38,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black/20 disabled:hover:text-white"
                          onClick={executeCode}
                          disabled={isRunning || isSubmitting}
                        >
                          Run
                        </button>
                        <button
                          className="rounded-lg border p-4 h-12 text-white border-amber-600 font-oxanium w-30 justify-center items-center flex bg-black/20 backdrop-blur-sm hover:bg-amber-600 hover:text-black transition-colors duration-300 shadow-[0_0_20px_rgba(220,38,38,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black/20 disabled:hover:text-white"
                          onClick={handleSubmit}
                          disabled={isSubmitting || isRunning}
                        >
                          Submit
                        </button>
                    </div>
                  </div>
                  <div className="flex-1 rounded overflow-hidden">
                    <Editor
                        height="100%"
                        language={language}
                        value={code}
                        onChange={(value) => setCode(value || "")}
                        theme="vs-dark"
                    />
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