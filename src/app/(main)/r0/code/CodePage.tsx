"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/shared/button";
import Editor, { useMonaco } from '@monaco-editor/react';
import CustomScrollbar from "@/components/shared/CustomScrollbar";
import { showSuccessToast, showErrorToast, showInfoToast } from "@/components/shared/CustomToast";
// import SocketDebug from '@/components/debug/SocketDebug'; // Uncomment for debugging

interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  constraints: string[];
  boilerplate: { [key: string]: string };
  sampleTestCases: TestCase[];
  hiddenTestCases?: TestCase[];
  testCases?: TestCase[]; // Legacy support
  hints: string[];
  avgTimeComplexity?: string;
  avgSpaceComplexity?: string;
}

interface TestCase {
  stdin?: string;
  expected_output?: string;
  input?: {
    stdin?: string;
    json?: any;
  };
  output?: {
    stdout?: string;
    json?: any;
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

export default function CodePage({ 
  round,
  currentProblem,
  problems,
  currentProblemIndex,
  timeRemaining,
  roundDuration,
  isRoundActive,
  isLoading,
  onNextQuestion,
  onReturnToLobby
}: CodePageProps) {
  const router = useRouter();
  const { user, session } = useAuth();

  // Code editor state
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [submissionResults, setSubmissionResults] = useState<SubmissionResult[] | null>(null);
  const [showHints, setShowHints] = useState(false);
  
  // Code persistence across problems with localStorage
  const [savedCode, setSavedCode] = useState<{ [problemId: string]: { [language: string]: string } }>({});
  const [isSaving, setIsSaving] = useState(false);

  // Load saved code from localStorage on component mount
  useEffect(() => {
    try {
      const savedCodeFromStorage = localStorage.getItem(`battlecode-r${round}-code`);
      if (savedCodeFromStorage) {
        const parsedCode = JSON.parse(savedCodeFromStorage);
        setSavedCode(parsedCode);
      }
    } catch (error) {
      console.error('Error loading saved code from localStorage:', error);
    }
  }, [round]);

  // Save code to localStorage whenever savedCode changes
  useEffect(() => {
    try {
      if (Object.keys(savedCode).length > 0) {
        localStorage.setItem(`battlecode-r${round}-code`, JSON.stringify(savedCode));
      }
    } catch (error) {
      console.error('Error saving code to localStorage:', error);
    }
  }, [savedCode, round]);

  // Save code before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentProblem && code && code !== (currentProblem.boilerplate[language] || '')) {
        try {
          const currentSavedCode = {
            ...savedCode,
            [currentProblem.id]: {
              ...savedCode[currentProblem.id],
              [language]: code
            }
          };
          localStorage.setItem(`battlecode-r${round}-code`, JSON.stringify(currentSavedCode));
        } catch (error) {
          console.error('Error saving code on page unload:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentProblem, code, language, savedCode, round]);
  
  // Resizable splitter state
  const [codeEditorHeight, setCodeEditorHeight] = useState(60);
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
      'javascript': 'javascript',
    };
    return languageMap[lang] || 'python';
  };

  // Monaco theme setup
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

  // Handle language change with code persistence
  useEffect(() => {
    try {
      if (currentProblem) {
        // Save current code before switching
        if (code && code !== (currentProblem.boilerplate[language] || '')) {
          setSavedCode(prev => ({
            ...prev,
            [currentProblem.id]: {
              ...prev[currentProblem.id],
              [language]: code
            }
          }));
        }

        // Load saved code or boilerplate for new language
        const savedCodeForLanguage = savedCode[currentProblem.id]?.[language];
        const boilerplateCode = currentProblem.boilerplate[language] || currentProblem.boilerplate['python'] || '';
        
        setCode(savedCodeForLanguage || boilerplateCode);
      }
    } catch (error) {
      console.error('Error updating code for language change:', error);
    }
  }, [language, currentProblem]);

  // Handle problem change with code persistence
  useEffect(() => {
    try {
      if (currentProblem) {
        // Load saved code for current problem and language, or use boilerplate
        const savedCodeForProblem = savedCode[currentProblem.id]?.[language];
        const boilerplateCode = currentProblem.boilerplate[language] || currentProblem.boilerplate['python'] || '';
        
        setCode(savedCodeForProblem || boilerplateCode);
        
        // Reset results when switching problems
        setSubmissionResults(null);
        setShowHints(false);
      }
    } catch (error) {
      console.error('Error updating code for problem change:', error);
    }
  }, [currentProblem]);

  // Save code periodically and on code changes
  useEffect(() => {
    if (currentProblem && code && code !== (currentProblem.boilerplate[language] || '')) {
      setIsSaving(true);
      const timeoutId = setTimeout(() => {
        setSavedCode(prev => {
          const newSavedCode = {
            ...prev,
            [currentProblem.id]: {
              ...prev[currentProblem.id],
              [language]: code
            }
          };
          
          // Also save to localStorage immediately for better persistence
          try {
            localStorage.setItem(`battlecode-r${round}-code`, JSON.stringify(newSavedCode));
          } catch (error) {
            console.error('Error saving code to localStorage:', error);
          }
          
          return newSavedCode;
        });
        setIsSaving(false);
      }, 500); // Reduced timeout for better responsiveness

      return () => {
        clearTimeout(timeoutId);
        setIsSaving(false);
      };
    }
  }, [code, currentProblem, language, round]);

  // Execute code using backend API endpoints
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

      // Prepare the request payload
      const payload = {
        language: language,
        source_code: code,
        problemId: currentProblem.id,
        ...(isSubmission ? { roundNumber: 0 } : {}) // Add roundNumber only for submissions
      };

      const endpoint = isSubmission ? '/api/submit/submit' : '/api/submit/run';
      
      const response = await fetch(`${apiUrl}${endpoint}`, {
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
        // Handle submission failure case
        showErrorToast(result.message || 'Submission failed');
        return;
      }

      // Process results for display
      const results = result.results || [];
      
      // Format results for display - adapt to our existing UI structure
      const formattedResults: SubmissionResult[] = results.map((res: any, index: number) => ({
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

      // Show summary results
      const summary = result.summary || {};
      const passedTests = summary.passed || 0;
      const totalTests = summary.total || results.length;

      if (isSubmission) {
        if (result.success) {
          if (passedTests === totalTests) {
            showSuccessToast(`🎉 All ${totalTests} test cases passed! Submission saved.`);
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
          showSuccessToast(`✅ All ${totalTests} sample test cases passed!`);
        } else {
          showErrorToast(`❌ ${passedTests}/${totalTests} sample test cases passed`);
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

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get timer display with color coding
  const getTimerDisplay = (): { time: string; className: string } => {
    const isWarning = timeRemaining <= 300; // 5 minutes
    const isCritical = timeRemaining <= 60;  // 1 minute
    
    return {
      time: formatTime(timeRemaining),
      className: isCritical ? 'border-red-600 text-red-400' : 
                 isWarning ? 'border-yellow-600 text-yellow-400' : 'border-amber-600'
    };
  };

  // Format test case data for display
  const formatTestCaseData = (data: any): string => {
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

  // Loading state
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

  // No problem state
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

  return (
    <div className="flex flex-col h-screen text-white overflow-hidden bg-[url('/bg-code.svg')] bg-fixed bg-cover bg-center oxanium">
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
              <Button
                content={showHints ? "Hide" : "Hint💡"}
                onClick={() => setShowHints(!showHints)}
              />
              {currentProblemIndex < problems.length - 1 && onNextQuestion && (
                <button
                  onClick={onNextQuestion}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Next →
                </button>
              )}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto min-h-0">
            {showHints && currentProblem.hints && currentProblem.hints.length > 0 && (
              <div className="mb-4 bg-gray-800 p-3 rounded">
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
                  <div key={i} className="mb-4 bg-gray-800 p-3 rounded font-mono text-sm">
                    <p className="font-bold text-gray-400">Input:</p>
                    <pre className="bg-gray-900 p-2 rounded mt-1 whitespace-pre-wrap">
                      {formatTestCaseData(testCase.stdin || testCase.input?.stdin || testCase.input?.json || '')}
                    </pre>
                    <p className="mt-2 font-bold text-gray-400">Output:</p>
                    <pre className="bg-gray-900 p-2 rounded mt-1 whitespace-pre-wrap">
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
          <div 
            className="border border-amber-600 rounded-lg p-4 flex flex-col min-h-0"
            style={{ height: `${codeEditorHeight}%`, minHeight: '200px' }}
          >
            <div className="flex justify-between items-center mb-2 gap-2">
              <div className="flex-1 flex gap-2">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-gray-800 flex-1 text-white p-2 rounded border border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="c">C</option>
                  <option value="javascript">JavaScript</option>
                </select>
                <div className={`bg-gray-800 flex-1 text-white p-2 rounded border focus:outline-none focus:ring-2 focus:ring-amber-500 text-center font-mono ${
                  getTimerDisplay().className
                }`}>
                  {getTimerDisplay().time}
                  {isSaving && <span className="ml-2 text-xs text-yellow-400">💾 Saving...</span>}
                  {!isSaving && currentProblem && savedCode[currentProblem.id]?.[language] && (
                    <span className="ml-2 text-xs text-green-400">✓ Saved</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  className="flex items-center gap-2 bg-gray-800 text-white p-2 rounded border border-amber-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  onClick={() => executeCode(false)}
                  disabled={isRunning || isSubmitting}
                >
                  <span>Run</span>
                  <img src="/run.svg" className="h-4 w-4"/>
                </button>
                <button 
                  className="bg-gray-800 text-white p-2 rounded border border-amber-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  onClick={() => executeCode(true)}
                  disabled={isSubmitting || isRunning}
                >
                  {isSubmitting ? "Submitting..." : "Submit"}
                </button>
                <button
                  className="bg-blue-800 text-white p-2 rounded border border-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  onClick={() => {
                    if (currentProblem) {
                      const boilerplateCode = currentProblem.boilerplate[language] || currentProblem.boilerplate['python'] || '';
                      setCode(boilerplateCode);
                      // Remove saved code for this problem-language combination
                      setSavedCode(prev => {
                        const newSavedCode = { ...prev };
                        if (newSavedCode[currentProblem.id]) {
                          delete newSavedCode[currentProblem.id][language];
                          if (Object.keys(newSavedCode[currentProblem.id]).length === 0) {
                            delete newSavedCode[currentProblem.id];
                          }
                        }
                        try {
                          localStorage.setItem(`battlecode-r${round}-code`, JSON.stringify(newSavedCode));
                        } catch (error) {
                          console.error('Error updating localStorage:', error);
                        }
                        return newSavedCode;
                      });
                      showInfoToast('Code reset to boilerplate');
                    }
                  }}
                  title="Reset to boilerplate code"
                >
                  🔄
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
      {/* <SocketDebug /> */}
    </div>
  );
}
