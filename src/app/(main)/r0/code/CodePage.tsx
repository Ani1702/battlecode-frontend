"use client";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
// import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Lightbulb, 
  RotateCcw, 
  Save, 
  AlertTriangle, 
  CheckCircle, 
  Play, 
  Send,
  // PartyPopper,
  // XCircle
} from "lucide-react";
import Button from "@/components/shared/button";
import Editor, { useMonaco } from '@monaco-editor/react';
import CustomScrollbar from "@/components/shared/CustomScrollbar";
import { showSuccessToast, showErrorToast, showInfoToast } from "@/components/shared/CustomToast";

interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  constraints: string[];
  boilerplate: { [key: string]: string };
  sampleTestCases: TestCase[];
  hiddenTestCases?: TestCase[];
  testCases?: TestCase[];
  hints: string[];
  avgTimeComplexity?: string;
  avgSpaceComplexity?: string;
}

interface TestCase {
  stdin?: string;
  expected_output?: string;
  input?: {
    stdin?: string;
    json?: Record<string, unknown>;
  };
  output?: {
    stdout?: string;
    json?: Record<string, unknown>;
  };
  explanation?: string;
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
  currentProblem: Problem | null;
  problems: Problem[];
  currentProblemIndex: number;
  timeRemaining: number;
  roundDuration: number;
  isRoundActive: boolean;
  isLoading: boolean;
  onNextQuestion?: () => void;
  onReturnToLobby?: () => void;
}

// ROBUST CONTEXT SYSTEM - Clear Conventions
interface CodeContext {
  round: string;
  questionId: string;
  language: string;
}

interface CodeStore {
  [contextKey: string]: string; // "round:questionId:language" -> code
}

export default function CodePage({
  round,
  currentProblem,
  problems,
  currentProblemIndex,
  timeRemaining,
  /*roundDuration,
  isRoundActive,*/
  isLoading,
  onNextQuestion,
  onReturnToLobby
}: CodePageProps) {
  /*const router = useRouter();*/
  const { user, session } = useAuth();

  // ============================================================================
  // CORE STATE - Clean and Isolated
  // ============================================================================
  
  // UI State
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");
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
  
  // UI State
  const [codeEditorHeight, setCodeEditorHeight] = useState(60);
  const [isDragging, setIsDragging] = useState(false);

  // Update refs when state changes
  useEffect(() => { codeRef.current = code; }, [code]);
  useEffect(() => { currentContextRef.current = currentContext; }, [currentContext]);
  useEffect(() => { languageRef.current = language; }, [language]);

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
    getBoilerplate: (problem: Problem | null, language: string): string => {
      if (!problem) return '';
      return problem.boilerplate[language] || problem.boilerplate['python'] || '';
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
    },
    
    // Clean up old contexts (optional - for memory management)
    cleanOldContexts: (store: CodeStore, currentRound: string): CodeStore => {
      const cleanStore: CodeStore = {};
      Object.keys(store).forEach(key => {
        const parsed = contextManager.parseContextKey(key);
        if (parsed && parsed.round === currentRound) {
          cleanStore[key] = store[key];
        }
      });
      return cleanStore;
    }
  }), []);

  // ============================================================================
  // INITIALIZATION - Load context and code store
  // ============================================================================
  
  useEffect(() => {
    if (!currentProblem || isContextInitialized) return;
    
    console.log('🚀 Initializing context for:', currentProblem.title);
    
    // Load code store from localStorage
    const loadedStore = contextManager.loadCodeStore(round);
    setCodeStore(loadedStore);
    
    // Create initial context
    const initialContext = contextManager.createContext(round, currentProblem.id, language);
    setCurrentContext(initialContext);
    
    // Load code for initial context
    const savedCode = contextManager.getCodeForContext(loadedStore, initialContext);
    const boilerplate = contextManager.getBoilerplate(currentProblem, language);
    const codeToLoad = savedCode || boilerplate;
    
    console.log('📝 Loading code for context:', initialContext, 'Code length:', codeToLoad.length);
    setCode(codeToLoad);
    
    setIsContextInitialized(true);
  }, [currentProblem, round, language, isContextInitialized, contextManager]);

  // ============================================================================
  // CONTEXT TRANSITION MANAGEMENT - The Heart of Robustness
  // ============================================================================
  
  const handleContextTransition = useCallback((newProblem: Problem | null, newLanguage: string) => {
    if (!newProblem || !currentContext) return;
    
    const newContext = contextManager.createContext(round, newProblem.id, newLanguage);
    
    // If context hasn't actually changed, don't do anything
    if (contextManager.contextEquals(currentContext, newContext)) {
      console.log('🔄 Context unchanged, skipping transition');
      return;
    }
    
    console.log('🔄 Context transition:', currentContext, '->', newContext);
    
    // STEP 1: Save current code to current context
    const currentCode = codeRef.current;
    const currentBoilerplate = contextManager.getBoilerplate(
      currentProblem, 
      currentContextRef.current?.language || language
    );
    
    if (currentCode && currentCode !== currentBoilerplate) {
      console.log('💾 Saving current code before transition');
      setCodeStore(prevStore => {
        const updatedStore = contextManager.setCodeForContext(prevStore, currentContext, currentCode);
        contextManager.saveCodeStore(round, updatedStore);
        return updatedStore;
      });
    }
    
    // STEP 2: Clear UI state for clean transition
    setSubmissionResults(null);
    if (newProblem.id !== currentProblem?.id) {
      setShowHints(false); // Only reset hints when changing problems, not languages
    }
    
    // STEP 3: Load code for new context
    const savedCodeForNewContext = contextManager.getCodeForContext(codeStore, newContext);
    const newBoilerplate = contextManager.getBoilerplate(newProblem, newLanguage);
    const codeToLoad = savedCodeForNewContext || newBoilerplate;
    
    console.log('📝 Loading code for new context:', newContext, 'Code length:', codeToLoad.length);
    
    // STEP 4: Update state atomically
    setCurrentContext(newContext);
    setCode(codeToLoad);
    
  }, [currentContext, currentProblem, round, language, codeStore, contextManager]);

  // ============================================================================
  // REACT TO PROP CHANGES - Problem or Language Changes
  // ============================================================================
  
  useEffect(() => {
    if (!isContextInitialized || !currentProblem) return;
    handleContextTransition(currentProblem, language);
  }, [currentProblem, language, isContextInitialized, handleContextTransition]);

  // ============================================================================
  // AUTO-SAVE SYSTEM - Debounced and Robust
  // ============================================================================
  
  const scheduleAutoSave = useCallback(() => {
    if (!currentContext || !codeRef.current) return;
    
    const codeToSave = codeRef.current;
    const boilerplate = contextManager.getBoilerplate(currentProblem, currentContext.language);
    
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
        const saveSuccess = contextManager.saveCodeStore(round, updatedStore);
        
        setSaveStatus(saveSuccess ? 'saved' : 'error');
        
        // Reset status after 2 seconds
        setTimeout(() => setSaveStatus('idle'), 2000);
        
        return updatedStore;
      });
      
      saveTimeoutRef.current = null;
    }, 600); // Quick debounce for responsive feel
    
  }, [currentContext, currentProblem, round, contextManager]);

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
          const boilerplate = contextManager.getBoilerplate(currentProblem, context.language);
          if (codeToSave !== boilerplate) {
            console.log('🚨 Emergency save before page unload');
            const currentStore = contextManager.loadCodeStore(round);
            const updatedStore = contextManager.setCodeForContext(currentStore, context, codeToSave);
            contextManager.saveCodeStore(round, updatedStore);
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
  }, [currentProblem, round, contextManager]);

  // ============================================================================
  // USER ACTIONS
  // ============================================================================

  const resetCodeToBoilerplate = () => {
    if (!currentProblem || !currentContext) return;
    
    const boilerplate = contextManager.getBoilerplate(currentProblem, language);
    setCode(boilerplate);
    
    // Remove saved code for this context
    setCodeStore(prevStore => {
      const updatedStore = contextManager.removeCodeForContext(prevStore, currentContext);
      contextManager.saveCodeStore(round, updatedStore);
      return updatedStore;
    });
    
    showInfoToast('Code reset to boilerplate');
  };

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

  // ============================================================================
  // MONACO EDITOR SETUP
  // ============================================================================

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

  const getMonacoLanguage = (lang: string) => {
    const languageMap: { [key: string]: string } = {
      'python': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'javascript': 'javascript',
    };
    return languageMap[lang] || 'python';
  };

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
          'editor.background': '#0a0a0a',
          'editor.foreground': '#ffffff',
          'editor.lineHighlightBackground': '#1a1a1a',
          'editor.selectionBackground': '#264f78',
          'editor.inactiveSelectionBackground': '#3a3d41',
          'editorCursor.foreground': '#f97316',
          'editorLineNumber.foreground': '#858585',
          'editorLineNumber.activeForeground': '#f97316',
          'editor.selectionHighlightBackground': '#ADD6FF26',
          'editor.wordHighlightBackground': '#575757B8',
          'editorBracketMatch.background': '#0064001a',
          'editorBracketMatch.border': '#888888',
        },
      });
      monaco.editor.setTheme('custom-dark');
    }
  }, [monaco]);

  // ============================================================================
  // CODE EXECUTION
  // ============================================================================

  const executeCode = async (isSubmission = false) => {
    if (!currentProblem) {
      showErrorToast('No problem loaded');
      return;
    }

    const action = isSubmission ? 'submitting' : 'running';
    showInfoToast(`${action.charAt(0).toUpperCase() + action.slice(1)} your code...`);

    if (isSubmission) {
      setIsSubmitting(true);
    } else {
      setIsRunning(true);
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) {
        throw new Error('API URL not configured');
      }

      const payload = {
        language: language,
        source_code: code,
        problemId: currentProblem.id,
        ...(isSubmission ? { roundNumber: parseInt(round) } : {})
      };

      const endpoint = isSubmission ? '/submit' : '/run';
      
      const response = await fetch(`${apiUrl}/api/submit${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.success && isSubmission) {
        showErrorToast(result.message || 'Submission failed');
        return;
      }

      const results = result.results || [];
      
      interface TestResult {
        token?: string;
        status?: {
          id?: number;
          description?: string;
        };
        passed?: boolean;
        stdout?: string;
        stderr?: string;
        compile_output?: string;
        time?: string;
        memory?: string;
      }

      const formattedResults: SubmissionResult[] = results.map((res: TestResult, index: number) => ({
        token: res.token || `test_${index}`,
        status: {
          id: res.status?.id || (res.passed ? 3 : 4),
          description: res.status?.description || (res.passed ? 'Accepted' : 'Wrong Answer')
        },
        stdout: res.stdout || null,
        stderr: res.stderr || null,
        compile_output: res.compile_output || null,
        time: res.time || null,
        memory: res.memory || null
      }));

      setSubmissionResults(formattedResults);

      const summary = result.summary || {};
      const passedTests = summary.passed || 0;
      const totalTests = summary.total || results.length;

      if (isSubmission) {
        if (result.success) {
          if (passedTests === totalTests) {
            showSuccessToast(`All ${totalTests} test cases passed! Submission saved.`);
          } else {
            showSuccessToast(`${passedTests}/${totalTests} test cases passed. Submission saved.`);
          }
          
          if (result.submission?.scoreUpdated) {
            showSuccessToast(`Score updated! New score: ${result.submission.score}`);
          }
        } else {
          showErrorToast(result.message || `${passedTests}/${totalTests} test cases passed`);
        }
      } else {
        if (passedTests === totalTests) {
          showSuccessToast(`All ${totalTests} sample test cases passed!`);
        } else {
          showErrorToast(`${passedTests}/${totalTests} sample test cases passed`);
        }
      }

    } catch (error) {
      console.error('Execution error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showErrorToast(`Failed to ${action} code: ${errorMessage}`);
    } finally {
      if (isSubmission) {
        setIsSubmitting(false);
      } else {
        setIsRunning(false);
      }
    }
  };

  // ============================================================================
  // RESIZABLE SPLITTER
  // ============================================================================

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const container = document.querySelector('.code-results-container') as HTMLElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const containerHeight = rect.height;
    const mouseY = e.clientY - rect.top;
    const newHeightPercentage = Math.max(20, Math.min(80, (mouseY / containerHeight) * 100));

    setCodeEditorHeight(newHeightPercentage);
  }, [isDragging]);

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
  }, [isDragging, handleMouseMove]);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerDisplay = (): { time: string; className: string } => {
    const isWarning = timeRemaining <= 300; // 5 minutes
    const isCritical = timeRemaining <= 60;  // 1 minute

    return {
      time: formatTime(timeRemaining),
      className: isCritical ? ' text-red-400' :
        isWarning ? ' text-yellow-400' : 'border-amber-600'
    };
  };

  const formatTestCaseData = (data: unknown): string => {
    if (typeof data === 'string') return data;
    if (Array.isArray(data)) return data.join(', ');
    if (typeof data === 'object' && data !== null) {
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

  // ============================================================================
  // RENDER CONDITIONS
  // ============================================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black/40 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <p>Loading Round {round}...</p>
        </div>
      </div>
    );
  }

  if (!currentProblem) {
    return (
      <div className="flex items-center justify-center h-screen bg-black/40 text-white">
        <div className="flex flex-col items-center gap-4">
          <p>No active round found or waiting for problems to load...</p>
          <button
            onClick={onReturnToLobby}
            className="px-6 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Return to Lobby
          </button>
        </div>
      </div>
    );
  }

  const saveStatusDisplay = getSaveStatusDisplay();

  // ============================================================================
  // RENDER
  // ============================================================================

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
      
      {/* Main Content */}
      <div className="flex-1 flex p-4 gap-4 bg-black/40 min-h-0">
        {/* Question Panel */}
        <CustomScrollbar className="w-1/2 flex border rounded-lg border-amber-600 bg-black/40 p-4 flex-col min-h-0 overflow-hidden glass-box">
          <div className="flex justify-between items-start mb-4 flex-shrink-0">
            <div>
              <h2 className="text-2xl font-bold">{currentProblem.title}</h2>
              <div className="flex gap-4 text-sm text-gray-400 mt-1">
                <span>Difficulty: {currentProblem.difficulty}</span>
                <span>Round: {round}</span>
                <span>Question: {currentProblemIndex + 1}/{problems.length}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowHints(!showHints)}
                className="rounded-lg border p-4 h-12 text-white border-amber-600 font-oxanium w-30 justify-center items-center flex bg-black/20 backdrop-blur-sm hover:bg-amber-600 hover:text-black transition-colors duration-300 shadow-[0_0_20px_rgba(220,38,38,0.3)] gap-2"
              >
                <Lightbulb className="h-4 w-4" />
                {showHints ? "Hide" : "Hint"}
              </button>
              {currentProblemIndex < problems.length - 1 && onNextQuestion && (
                <Button
                  content="Next →"
                  onClick={onNextQuestion}
                />
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {showHints && currentProblem.hints && currentProblem.hints.length > 0 && (
              <div className="mb-4 bg-black p-3 rounded">
                <h3 className="font-bold mb-2 text-amber-400">Hints:</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-2">
                  {currentProblem.hints.map((hint, i) => <li key={i}>{hint}</li>)}
                </ul>
              </div>
            )}

            <p className="mb-4 text-gray-300 whitespace-pre-wrap">{currentProblem.description}</p>

            {currentProblem.constraints && currentProblem.constraints.length > 0 && (
              <>
                <h3 className="font-bold mb-2 text-amber-400">Constraints:</h3>
                <ul className="list-disc list-inside mb-4 text-gray-300 font-mono text-sm">
                  {currentProblem.constraints.map((constraint, i) => (
                    <li key={i}>{constraint}</li>
                  ))}
                </ul>
              </>
            )}

            {currentProblem.sampleTestCases && currentProblem.sampleTestCases.length > 0 && (
              <>
                <h3 className="font-bold mb-4 text-amber-400">Sample Cases:</h3>
                {currentProblem.sampleTestCases.map((testCase, i) => (
                  <div key={i} className="mb-4 bg-black p-3 rounded font-mono text-sm">
                    <p className="font-bold text-gray-400">Input:</p>
                    <pre className="bg-gray-800 p-2 rounded mt-1 whitespace-pre-wrap">
                      {formatTestCaseData(testCase.stdin || testCase.input?.stdin || testCase.input?.json || '')}
                    </pre>
                    <p className="mt-2 font-bold text-gray-400">Output:</p>
                    <pre className="bg-gray-800 p-2 rounded mt-1 whitespace-pre-wrap">
                      {formatTestCaseData(testCase.expected_output || testCase.output?.stdout || testCase.output?.json || '')}
                    </pre>
                    {testCase.explanation && (
                      <p className="mt-2 text-xs text-gray-400 italic">
                        Explanation: {testCase.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </CustomScrollbar>

        {/* Code & Results Panel */}
        <div className="w-1/2 flex flex-col code-results-container border-amber-500" style={{ height: '100%' }}>
          {/* Code Editor */}
          <div className="border border-amber-600 rounded-lg p-4 flex flex-col min-h-0" style={{ height: `${codeEditorHeight}%`, minHeight: '200px' }}>
            <div className="flex justify-between items-center mb-2 gap-2">
              <div className="flex-1 flex gap-2">
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className="bg-black flex-[0.3]  text-white p-2 rounded border w-20 border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="c">C</option>
                  <option value="javascript">JavaScript</option>
                </select>
                <div className={`bg-black flex-[0.2] text-white p-2 rounded border border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 text-center font-mono ${getTimerDisplay().className
                  }`}>
                  {getTimerDisplay().time}
                  {saveStatusDisplay.text && (
                    <span className={`ml-2 text-xs ${saveStatusDisplay.className} flex items-center gap-1`}>
                      {saveStatusDisplay.icon}
                      {saveStatusDisplay.text}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="flex items-center gap-2 bg-black text-white p-2 rounded border border-amber-600 hover:bg-black focus:outline-none focus:ring-2 focus:ring-amber-500"
                  onClick={() => executeCode(false)}
                  disabled={isRunning || isSubmitting}
                >
                  <Play className="h-4 w-4"/>
                  <span>Run</span>
                </button>
                <button 
                  className="flex items-center gap-2 bg-gray-800 text-white p-2 rounded border border-amber-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  onClick={() => executeCode(true)}
                  disabled={isSubmitting || isRunning}
                >
                  <Send className="h-4 w-4"/>
                  {isSubmitting ? "Submitting..." : "Submit"}
                </button>
                <button
                  className="flex items-center gap-2 bg-black text-white p-2 rounded border border-amber-600  focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  onClick={resetCodeToBoilerplate}
                  title="Reset to boilerplate code"
                >
                  <RotateCcw className="h-4 w-4"/>
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
                  <div className="flex items-center justify-center h-full bg-black">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
                  </div>
                }
              />
            </div>
          </div>

          {/* Resizable Divider */}
          <div
            className={`h-1 bg-amber-600/20 hover:bg-amber-600/40 cursor-row-resize transition-colors duration-200 flex items-center justify-center ${isDragging ? 'bg-amber-600/60' : ''
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
              {(isSubmitting || isRunning) && (
                <div className="flex items-center gap-2 text-amber-400">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-500"></div>
                  <span>{isSubmitting ? 'Submitting' : 'Running'} your solution...</span>
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
